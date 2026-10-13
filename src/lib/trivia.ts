// Quiz bank for everyone: kids, teenagers at school, adults. Every question has the answer and a "did you know" note,
// so the player learns something on the spot (no "search the internet" step).
export type Band = "kids" | "teen" | "adult";
export type Topic = "italiano" | "english" | "storia" | "geografia" | "scienze" | "mate" | "arte" | "civica" | "modi" | "locale";

export type Trivia = { id: string; topic: Topic; bands: Band[]; q: string; options: string[]; ok: number; why: string };

export const TOPICS: { id: Topic; label: string; icon: string }[] = [
  { id: "italiano", label: "Italiano", icon: "📖" },
  { id: "english", label: "Inglese", icon: "🇬🇧" },
  { id: "storia", label: "Storia", icon: "🏛️" },
  { id: "geografia", label: "Geografia", icon: "🌍" },
  { id: "scienze", label: "Scienze", icon: "🔬" },
  { id: "mate", label: "Matematica", icon: "➗" },
  { id: "arte", label: "Arte e musica", icon: "🎨" },
  { id: "civica", label: "Educazione civica", icon: "⚖️" },
  { id: "modi", label: "Modi di dire", icon: "💬" },
  { id: "locale", label: "Bra e Piemonte", icon: "🧀" },
];

const ALL: Band[] = ["kids", "teen", "adult"];
const TA: Band[] = ["teen", "adult"];
const KT: Band[] = ["kids", "teen"];

// q(topic, bands, question, [right answer, wrong, wrong, wrong], explanation). The right answer is written first and shuffled when shown.
let n = 0;
const q = (topic: Topic, bands: Band[], text: string, opts: string[], why: string): Trivia => ({ id: `t${++n}`, topic, bands, q: text, options: opts, ok: 0, why });

export const BANK: Trivia[] = [
  // ---------- Italiano
  q("italiano", TA, "Qual è il plurale di «uovo»?", ["le uova", "gli uovi", "le uove", "gli uova"], "È un plurale irregolare: «uovo» diventa «le uova» (femminile), come «il braccio → le braccia»."),
  q("italiano", TA, "Quale frase è corretta?", ["Se avessi saputo, sarei venuto", "Se avrei saputo, sarei venuto", "Se avessi saputo, verrei venuto", "Se saprei, sarei venuto"], "Dopo «se» che esprime un'ipotesi irreale si usa il congiuntivo trapassato: «se avessi saputo»."),
  q("italiano", TA, "Che cosa significa «effimero»?", ["Che dura poco", "Che è molto grande", "Che è molto antico", "Che è pieno di colori"], "Dal greco «ephḗmeros», cioè «che dura un giorno»: ciò che è passeggero."),
  q("italiano", ALL, "Qual è il contrario di «generoso»?", ["Avaro", "Gentile", "Ricco", "Timido"], "L'avaro tiene tutto per sé; il generoso dà volentieri."),
  q("italiano", TA, "«Qual è» si scrive con l'apostrofo?", ["No: «qual è» senza apostrofo", "Sì: «qual'è»", "Sì, sempre", "Solo davanti alle vocali"], "«Qual» è un troncamento, non un'elisione: davanti a «è» non vuole l'apostrofo."),
  q("italiano", ALL, "Chi ha scritto «I promessi sposi»?", ["Alessandro Manzoni", "Dante Alighieri", "Giovanni Verga", "Italo Calvino"], "Manzoni, nell'Ottocento: è il più famoso romanzo storico italiano."),
  q("italiano", TA, "«Penso che tu ___ ragione.» Quale verbo va bene?", ["abbia", "hai", "avrai", "avevi"], "Dopo «penso che» si usa il congiuntivo presente: «tu abbia»."),
  q("italiano", TA, "Che cosa significa «procrastinare»?", ["Rimandare a più tardi", "Fare in fretta", "Cancellare del tutto", "Ripetere due volte"], "Procrastinare è rimandare un'azione: dal latino «pro» (avanti) e «cras» (domani)."),
  q("italiano", ALL, "Dante Alighieri scrisse la «Divina Commedia» in…", ["volgare fiorentino", "latino", "greco", "francese"], "Scelse la lingua che parlava la gente, il volgare fiorentino: per questo è considerato il padre dell'italiano."),
  q("italiano", KT, "Quale parola è un sinonimo di «veloce»?", ["Rapido", "Pigro", "Pesante", "Lento"], "I sinonimi sono parole con significato simile: veloce, rapido, svelto."),
  // ---------- Inglese
  q("english", ALL, "Come si dice «biblioteca» in inglese?", ["library", "bookshop", "librarian", "libretto"], "Attenzione al «falso amico»: «library» è la biblioteca, «bookshop» è la libreria dove si comprano i libri."),
  q("english", ALL, "Come si dice «Mi chiamo Luca»?", ["My name is Luca", "I am call Luca", "Me name Luca", "I call me Luca"], "Si dice «My name is…» oppure «I'm Luca»."),
  q("english", ALL, "«I am fifteen» significa…", ["Ho quindici anni", "Mi sento quindici volte", "Sono alto quindici", "Sono il quindicesimo"], "In inglese l'età si dice con il verbo «to be» (essere), non con «avere»."),
  q("english", TA, "Che cosa significa «Break a leg!»?", ["In bocca al lupo!", "Rompiti una gamba (davvero)", "Stai attento!", "Fai silenzio!"], "È l'augurio che gli attori si fanno prima di salire sul palco: come il nostro «in bocca al lupo»."),
  q("english", ALL, "Qual è il passato di «to go»?", ["went", "goed", "gone", "going"], "«Go» è irregolare: go – went – gone."),
  q("english", TA, "«Actually» significa…", ["In realtà", "Attualmente", "Subito", "Veramente tanto"], "Falso amico: «attualmente» si dice «currently» o «at the moment»."),
  q("english", TA, "«He is very sensible» significa…", ["È molto ragionevole", "È molto sensibile", "È molto sensuale", "È molto timido"], "«Sensible» è ragionevole; «sensibile» in inglese si dice «sensitive»."),
  q("english", ALL, "Come si chiede «Che ore sono?»", ["What time is it?", "What hour is it?", "Which time are you?", "How many hours?"], "Si usa «What time is it?» oppure «Have you got the time?»."),
  q("english", ALL, "«Thank you very much» significa…", ["Grazie mille", "Prego, di nulla", "Scusi tanto", "Buona giornata"], "Per rispondere si può dire «You're welcome» (prego)."),
  q("english", TA, "Qual è il passato di «to buy»?", ["bought", "buyed", "boughten", "buyt"], "«Buy» è irregolare: buy – bought – bought."),
  q("english", TA, "«I pretend to sleep» significa…", ["Faccio finta di dormire", "Pretendo di dormire", "Dormo profondamente", "Voglio dormire"], "Falso amico: «pretendere» in inglese è «to demand»; «to pretend» è fingere."),
  q("english", KT, "Come si dice «gatto» in inglese?", ["cat", "dog", "bat", "rat"], "Cat = gatto, dog = cane, bat = pipistrello, rat = ratto."),
  // ---------- Storia
  q("storia", TA, "In che anno cadde l'Impero romano d'Occidente?", ["476 d.C.", "1492", "312 d.C.", "800 d.C."], "Nel 476 d.C. Odoacre depose l'ultimo imperatore, Romolo Augustolo: per convenzione inizia il Medioevo."),
  q("storia", ALL, "Chi scoprì l'America nel 1492?", ["Cristoforo Colombo", "Amerigo Vespucci", "Marco Polo", "Vasco da Gama"], "Colombo, genovese, partì per le Indie e arrivò nelle Americhe il 12 ottobre 1492."),
  q("storia", TA, "In che anno fu proclamato il Regno d'Italia?", ["1861", "1848", "1870", "1946"], "Nel 1861; la prima capitale fu Torino, poi Firenze e dal 1871 Roma."),
  q("storia", TA, "Quando iniziò la Rivoluzione francese?", ["1789", "1815", "1750", "1914"], "Il 14 luglio 1789 con la presa della Bastiglia."),
  q("storia", TA, "Quando si combatté la Prima guerra mondiale?", ["1914–1918", "1939–1945", "1861–1865", "1900–1905"], "Dal 1914 al 1918; l'Italia entrò in guerra nel 1915."),
  q("storia", ALL, "Chi fu il primo re d'Italia?", ["Vittorio Emanuele II", "Umberto I", "Giuseppe Garibaldi", "Camillo Cavour"], "Vittorio Emanuele II di Savoia, re di Sardegna, divenne re d'Italia nel 1861."),
  q("storia", TA, "Quando finì la Seconda guerra mondiale in Europa?", ["1945", "1939", "1950", "1918"], "L'8 maggio 1945 con la resa della Germania."),
  q("storia", ALL, "Quando gli italiani scelsero la Repubblica con il referendum?", ["2 giugno 1946", "25 aprile 1945", "1 gennaio 1948", "4 novembre 1918"], "Il 2 giugno 1946: per questo il 2 giugno è la Festa della Repubblica."),
  q("storia", TA, "Secondo la tradizione, in che anno fu fondata Roma?", ["753 a.C.", "476 d.C.", "1000 a.C.", "44 a.C."], "La leggenda dice il 21 aprile del 753 a.C., da Romolo."),
  q("storia", ALL, "Come si chiamava la scrittura degli antichi Egizi?", ["Geroglifici", "Alfabeto latino", "Cuneiforme", "Rune"], "I geroglifici, decifrati nel 1822 grazie alla stele di Rosetta."),
  // ---------- Geografia
  q("geografia", ALL, "Qual è il capoluogo del Piemonte?", ["Torino", "Cuneo", "Alessandria", "Asti"], "Torino, che è stata anche la prima capitale d'Italia."),
  q("geografia", ALL, "Qual è il fiume più lungo d'Italia?", ["Il Po", "Il Tevere", "L'Adige", "L'Arno"], "Il Po, circa 650 km: nasce dal Monviso, in provincia di Cuneo, vicino a Bra."),
  q("geografia", TA, "Quale vetta, visibile da Bra nelle giornate limpide, è detta «il Re di pietra»?", ["Il Monviso", "Il Monte Bianco", "Il Cervino", "Il Gran Paradiso"], "Il Monviso (3.841 m) domina le Alpi Cozie; dalle sue pendici nasce il Po."),
  q("geografia", ALL, "Qual è l'oceano più grande del mondo?", ["Pacifico", "Atlantico", "Indiano", "Artico"], "Il Pacifico copre da solo circa un terzo della superficie terrestre."),
  q("geografia", TA, "Qual è la capitale dell'Australia?", ["Canberra", "Sydney", "Melbourne", "Perth"], "Non Sydney: la capitale è Canberra, scelta come compromesso tra Sydney e Melbourne."),
  q("geografia", ALL, "Quante regioni ha l'Italia?", ["20", "18", "21", "15"], "Sono 20, di cui 5 a statuto speciale."),
  q("geografia", ALL, "Quale mare bagna la costa tra l'Italia e la Croazia?", ["Adriatico", "Tirreno", "Ionio", "Ligure"], "Il mare Adriatico, tra la costa italiana orientale e i Balcani."),
  q("geografia", KT, "Come si chiama il vulcano vicino a Napoli?", ["Vesuvio", "Etna", "Stromboli", "Monte Bianco"], "Il Vesuvio: nel 79 d.C. distrusse Pompei ed Ercolano."),
  q("geografia", ALL, "Qual è il deserto caldo più grande del mondo?", ["Sahara", "Gobi", "Kalahari", "Atacama"], "Il Sahara, in Africa, è grande quasi come tutta l'Europa."),
  q("geografia", ALL, "Qual è la capitale del Giappone?", ["Tokyo", "Kyoto", "Osaka", "Pechino"], "Tokyo; Kyoto fu la capitale imperiale fino al 1868."),
  // ---------- Scienze
  q("scienze", ALL, "Qual è la formula chimica dell'acqua?", ["H₂O", "CO₂", "O₂", "NaCl"], "Due atomi di idrogeno (H) e uno di ossigeno (O)."),
  q("scienze", ALL, "Qual è il pianeta più vicino al Sole?", ["Mercurio", "Venere", "Marte", "Terra"], "Mercurio, che compie un giro attorno al Sole in soli 88 giorni."),
  q("scienze", TA, "Quante ossa ha il corpo di un adulto?", ["206", "106", "306", "256"], "206; i neonati ne hanno circa 300, perché molte si saldano crescendo."),
  q("scienze", TA, "Quale gas è il più abbondante nell'aria che respiriamo?", ["Azoto", "Ossigeno", "Anidride carbonica", "Idrogeno"], "L'azoto è circa il 78%; l'ossigeno solo il 21%."),
  q("scienze", TA, "Che cosa fa la fotosintesi clorofilliana?", ["Trasforma luce, acqua e CO₂ in zuccheri e ossigeno", "Trasforma zuccheri in luce", "Produce solo azoto", "Assorbe ossigeno di notte"], "Le piante usano la luce per fabbricare zuccheri e liberano ossigeno."),
  q("scienze", TA, "Quanto vale circa la velocità della luce?", ["300.000 km al secondo", "300 km al secondo", "3.000 km all'ora", "30.000 km al secondo"], "Circa 300.000 km/s: la luce del Sole ci arriva in circa 8 minuti."),
  q("scienze", KT, "Quale organo pompa il sangue nel corpo?", ["Il cuore", "Il fegato", "I polmoni", "Lo stomaco"], "Il cuore batte circa 100.000 volte al giorno."),
  q("scienze", ALL, "A quale temperatura bolle l'acqua a livello del mare?", ["100 °C", "90 °C", "120 °C", "50 °C"], "A 100 °C; in alta montagna bolle prima, perché la pressione è più bassa."),
  q("scienze", TA, "Chi formulò la legge di gravitazione universale?", ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Marie Curie"], "Newton, nel Seicento: la stessa forza fa cadere una mela e tiene la Luna in orbita."),
  q("scienze", KT, "Quale pianeta è chiamato «il pianeta rosso»?", ["Marte", "Giove", "Venere", "Saturno"], "Marte è rosso per l'ossido di ferro, cioè la ruggine, sul suo suolo."),
  // ---------- Matematica e logica
  q("mate", ALL, "Quanto fa 12 × 12?", ["144", "124", "122", "154"], "12 × 12 = 144, cioè una dozzina di dozzine (una «grossa»)."),
  q("mate", ALL, "Qual è la radice quadrata di 81?", ["9", "8", "7", "11"], "9 × 9 = 81."),
  q("mate", ALL, "Quanti gradi misura un angolo retto?", ["90°", "180°", "45°", "360°"], "L'angolo retto è 90°: un quarto di giro."),
  q("mate", TA, "Se 3 mele costano 2 €, quanto costano 9 mele?", ["6 €", "4 €", "5 €", "9 €"], "9 mele sono 3 volte 3 mele: 3 × 2 € = 6 €."),
  q("mate", TA, "Quanto fa il 25% di 200?", ["50", "25", "75", "100"], "Il 25% è un quarto: 200 ÷ 4 = 50."),
  q("mate", ALL, "Qual è il numero che continua: 2, 4, 8, 16, …?", ["32", "24", "30", "20"], "Ogni numero è il doppio del precedente: 16 × 2 = 32."),
  q("mate", TA, "Quanto vale la somma degli angoli interni di un triangolo?", ["180°", "90°", "270°", "360°"], "Sempre 180°, qualunque sia il triangolo."),
  q("mate", KT, "Quanti lati ha un esagono?", ["6", "5", "8", "7"], "Esa- vuol dire sei: l'esagono ha 6 lati."),
  q("mate", TA, "Quale di questi è un numero primo?", ["13", "9", "15", "21"], "13 si divide solo per 1 e per sé stesso; 9, 15 e 21 si dividono anche per 3."),
  q("mate", TA, "Quanto vale circa il pi greco (π)?", ["3,14", "2,71", "1,62", "4,13"], "π è il rapporto tra circonferenza e diametro: circa 3,14159…"),
  // ---------- Arte e musica
  q("arte", ALL, "Chi dipinse la «Gioconda»?", ["Leonardo da Vinci", "Raffaello", "Michelangelo", "Caravaggio"], "Leonardo da Vinci, all'inizio del Cinquecento; oggi è al Louvre di Parigi."),
  q("arte", ALL, "Chi scolpì il «David» che sta a Firenze?", ["Michelangelo", "Donatello", "Bernini", "Canova"], "Michelangelo, tra il 1501 e il 1504, da un unico blocco di marmo."),
  q("arte", TA, "Chi compose «Le quattro stagioni»?", ["Antonio Vivaldi", "Giuseppe Verdi", "Gioachino Rossini", "Mozart"], "Il veneziano Vivaldi, nel Settecento: quattro concerti per violino."),
  q("arte", TA, "Chi dipinse «La notte stellata»?", ["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dalí"], "Van Gogh, nel 1889, vista dalla finestra della clinica di Saint-Rémy."),
  q("arte", ALL, "In quale città si trova il teatro alla Scala?", ["Milano", "Roma", "Napoli", "Torino"], "A Milano: è uno dei teatri d'opera più famosi del mondo."),
  q("arte", TA, "Chi compose l'«Inno alla gioia», diventato inno europeo?", ["Ludwig van Beethoven", "Johann Sebastian Bach", "Chopin", "Puccini"], "Beethoven, nell'ultimo movimento della Nona sinfonia (1824)."),
  q("arte", TA, "Chi dipinse «La nascita di Venere»?", ["Sandro Botticelli", "Tiziano", "Giotto", "Leonardo"], "Botticelli, a Firenze, verso il 1485: oggi è agli Uffizi."),
  q("arte", KT, "Quante sono le note della scala musicale?", ["7", "5", "8", "12"], "Sette: do, re, mi, fa, sol, la, si."),
  q("arte", TA, "Chi compose «La Traviata»?", ["Giuseppe Verdi", "Giacomo Puccini", "Gaetano Donizetti", "Vincenzo Bellini"], "Giuseppe Verdi, nel 1853, ispirato a «La signora delle camelie»."),
  q("arte", TA, "Di quale stile è il Duomo di Milano?", ["Gotico", "Romanico", "Barocco", "Neoclassico"], "Gotico: ci vollero quasi sei secoli per finirlo."),
  // ---------- Educazione civica
  q("civica", ALL, "Da quale età si può votare per la Camera dei deputati?", ["18 anni", "16 anni", "21 anni", "25 anni"], "Dal 18° anno di età; per il Senato serve aver compiuto 18 anni (da una riforma del 2021)."),
  q("civica", TA, "Quanti anni dura il mandato del Presidente della Repubblica?", ["7", "5", "10", "4"], "Sette anni, eletto dal Parlamento riunito insieme ai delegati delle Regioni."),
  q("civica", ALL, "Come si chiama la legge fondamentale dello Stato italiano?", ["Costituzione", "Codice civile", "Statuto albertino", "Decreto legge"], "La Costituzione, entrata in vigore il 1° gennaio 1948."),
  q("civica", ALL, "Qual è il numero unico per le emergenze in Europa?", ["112", "118", "911", "113"], "Il 112 funziona in tutta l'Unione europea, anche senza credito."),
  q("civica", ALL, "Chi approva le leggi in Italia?", ["Il Parlamento", "Il Presidente del Consiglio da solo", "I sindaci", "La Corte costituzionale"], "Camera e Senato: il Parlamento esercita il potere legislativo."),
  q("civica", ALL, "Dove si butta una bottiglia di vetro?", ["Nella campana del vetro", "Nella carta", "Nell'indifferenziato", "Nell'umido"], "Il vetro si ricicla all'infinito: va nella campana o nel contenitore del vetro."),
  q("civica", KT, "Quali sono i colori della bandiera italiana?", ["Verde, bianco e rosso", "Rosso, bianco e blu", "Verde, giallo e rosso", "Bianco, rosso e nero"], "Il Tricolore è la bandiera ufficiale dal 1948 (nata nel 1797)."),
  q("civica", TA, "Che cosa dice l'articolo 1 della Costituzione?", ["L'Italia è una Repubblica democratica fondata sul lavoro", "L'Italia è una monarchia parlamentare", "L'Italia è uno Stato federale", "L'Italia è una repubblica presidenziale"], "È la frase che apre la Costituzione: la sovranità appartiene al popolo."),
  q("civica", ALL, "Che cosa devi fare ai passaggi pedonali con un pedone che attraversa?", ["Dare la precedenza", "Suonare il clacson", "Accelerare", "Passare dietro di lui senza rallentare"], "Chi guida deve fermarsi e dare la precedenza ai pedoni sulle strisce."),
  q("civica", KT, "Il semaforo è rosso: che cosa fai?", ["Mi fermo e aspetto", "Attraverso di corsa", "Guardo solo a destra", "Cammino piano ma attraverso"], "Rosso significa stop, anche per i pedoni."),
  // ---------- Modi di dire
  q("modi", ALL, "Che cosa significa «avere le mani in pasta»?", ["Essere coinvolto in qualcosa", "Cucinare bene", "Essere molto sporco", "Avere le mani fredde"], "Chi ha le mani in pasta partecipa direttamente a un affare, come chi impasta."),
  q("modi", ALL, "«Menare il can per l'aia» vuol dire…", ["Tirare le cose per le lunghe", "Portare il cane a spasso", "Andare in campagna", "Fare un lavoro faticoso"], "Girare intorno senza arrivare al punto."),
  q("modi", ALL, "Che cosa si risponde a «In bocca al lupo!»?", ["Crepi!", "Grazie mille", "Anche a te", "Mai"], "«Crepi il lupo!»: è un augurio di fortuna prima di un esame o di una prova."),
  q("modi", ALL, "«Prendere due piccioni con una fava» significa…", ["Ottenere due risultati con una sola azione", "Mangiare molto", "Fare una caccia", "Fare un errore doppio"], "Raggiungere due scopi con un solo gesto."),
  q("modi", ALL, "«Piove sul bagnato» vuol dire…", ["Le fortune (o le sfortune) arrivano a chi ne ha già", "Piove spesso in autunno", "Ho dimenticato l'ombrello", "Il tempo cambia in fretta"], "Si dice quando una cosa buona o cattiva capita a chi ne ha già avute."),
  q("modi", ALL, "Che cosa vuol dire «avere la testa tra le nuvole»?", ["Essere distratti", "Essere molto alti", "Essere felici", "Volare in aereo"], "Chi ha la testa tra le nuvole non è concentrato su ciò che fa."),
  q("modi", ALL, "«Essere al verde» significa…", ["Non avere soldi", "Essere sportivi", "Stare in giardino", "Essere invidiosi"], "Si dice che deriva dal fondo verde delle candele all'asta: finita la candela, finiti i soldi."),
  q("modi", ALL, "Che cosa vuol dire «costare un occhio della testa»?", ["Costare moltissimo", "Essere pericoloso", "Essere raro", "Essere difficile da trovare"], "Una cosa che costa un occhio della testa è carissima."),
  // ---------- Bra e Piemonte
  q("locale", ALL, "Quale vino rosso famoso si produce nelle Langhe, vicino a Bra?", ["Barolo", "Chianti", "Montepulciano", "Lambrusco"], "Il Barolo, da uve nebbiolo: è chiamato «il re dei vini»."),
  q("locale", ALL, "Qual era la prima capitale del Regno d'Italia?", ["Torino", "Firenze", "Roma", "Milano"], "Torino, dal 1861 al 1865."),
  q("locale", ALL, "Quale frutto secco è famoso in Piemonte, la «Tonda gentile»?", ["La nocciola", "La noce", "La mandorla", "Il pistacchio"], "La nocciola Piemonte IGP: è tra gli ingredienti tipici della gianduia e dei dolci piemontesi."),
  q("locale", ALL, "Quale movimento nacque a Bra nel 1986?", ["Slow Food", "Fast Food", "Km Zero", "Bio Day"], "Slow Food, fondato da Carlo Petrini: difende il cibo buono, pulito e giusto."),
  q("locale", ALL, "Che cosa si studia all'Università di Scienze Gastronomiche di Pollenzo?", ["Il cibo e la sua cultura", "Solo la cucina", "Ingegneria", "Medicina"], "A Pollenzo, frazione di Bra, si studia il cibo da molti punti di vista: scienza, storia, economia."),
  q("locale", KT, "Come si chiama la città con la grande torre «Mole Antonelliana»?", ["Torino", "Bra", "Cuneo", "Asti"], "La Mole Antonelliana è il simbolo di Torino e oggi ospita il Museo del Cinema."),
];

export const bandLabel: Record<Band, string> = { kids: "Bambino", teen: "Ragazzo", adult: "Adulto" };

const KEY_PROFILE = "aura_trivia_band";
const KEY_SEEN = "aura_trivia_seen";
export const getBand = (): Band => {
  try {
    const v = localStorage.getItem(KEY_PROFILE);
    return v === "kids" || v === "teen" || v === "adult" ? v : "adult";
  } catch {
    return "adult";
  }
};
export const setBand = (b: Band) => {
  try { localStorage.setItem(KEY_PROFILE, b); } catch { /* ignore */ }
};

const seenIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY_SEEN) ?? "[]") as string[]; } catch { return []; }
};
const markSeen = (id: string) => {
  try { localStorage.setItem(KEY_SEEN, JSON.stringify([...seenIds(), id].slice(-80))); } catch { /* ignore */ }
};

/** Picks a question for the player's age group and chosen subject, avoiding the ones seen most recently. */
export function nextTrivia(band: Band, topic: Topic | "mix"): Trivia {
  const pool = BANK.filter((t) => t.bands.includes(band) && (topic === "mix" || t.topic === topic));
  const seen = new Set(seenIds());
  const fresh = pool.filter((t) => !seen.has(t.id));
  const from = fresh.length ? fresh : pool;
  const pick = from[Math.floor(Math.random() * from.length)]!;
  markSeen(pick.id);
  return pick;
}

/** Shows the options in a different order every time (the right one is always written first in the bank). */
export function shuffled(t: Trivia): { text: string; right: boolean }[] {
  const opts = t.options.map((text, i) => ({ text, right: i === t.ok }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j]!, opts[i]!];
  }
  return opts;
}
