import Foundation
import UIKit
import Capacitor
import Speech
import AVFoundation

/// Live dictation with Apple's own speech recognition: the words arrive while the person is still talking ("partial" events).
@objc(LiveSpeechPlugin)
public class LiveSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveSpeechPlugin"
    public let jsName = "LiveSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var running = false

    @objc func start(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "it-IT"
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { call.reject("denied"); return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else { call.reject("denied"); return }
                DispatchQueue.main.async { self.begin(call, lang: lang) }
            }
        }
    }

    private func begin(_ call: CAPPluginCall, lang: String) {
        cleanup()
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang)) ?? SFSpeechRecognizer(), recognizer.isAvailable else {
            call.reject("unavailable")
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            request = req
            let input = engine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in req.append(buffer) }
            engine.prepare()
            try engine.start()
            running = true
            task = recognizer.recognitionTask(with: req) { [weak self] result, error in
                guard let self = self else { return }
                if let result = result {
                    self.notifyListeners("partial", data: ["text": result.bestTranscription.formattedString, "final": result.isFinal])
                }
                if error != nil || (result?.isFinal ?? false) {
                    self.cleanup()
                    self.notifyListeners("end", data: [:])
                }
            }
            call.resolve()
        } catch {
            cleanup()
            call.reject("unavailable")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        // Stop listening; the recognizer still delivers the last words as a final result.
        if running {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
            request?.endAudio()
            running = false
        }
        call.resolve()
    }

    private func cleanup() {
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        running = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

/// The Capacitor view controller that also registers our own plugin.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveSpeechPlugin())
    }

    // The app must feel native: the page never stretches or bounces from the edges and cannot be pinched.
    override func viewDidLoad() {
        super.viewDidLoad()
        guard let sv = webView?.scrollView else { return }
        webView?.allowsBackForwardNavigationGestures = false
        sv.bounces = false
        sv.alwaysBounceVertical = false
        sv.alwaysBounceHorizontal = false
        sv.pinchGestureRecognizer?.isEnabled = false
        sv.minimumZoomScale = 1
        sv.maximumZoomScale = 1
    }
}
