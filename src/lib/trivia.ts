// Quiz bank for everyone: kids, teenagers at school, adults. Every question has the answer and a "did you know" note,
// so the player learns something on the spot (no "search the internet" step).
export type Band = "kids" | "teen" | "adult";
export type Topic = "oggi" | "patente" | "diritti" | "salute" | "soldi" | "digitale" | "italiano" | "english" | "storia" | "geografia" | "scienze" | "mate" | "arte" | "civica" | "modi" | "locale";

export type Trivia = { id: string; topic: Topic; bands: Band[]; q: string; options: string[]; ok: number; why: string; ai?: boolean };

export const TOPICS: { id: Topic; label: string; icon: string }[] = [
  { id: "oggi", label: "Accade oggi", icon: "oggi" },
  { id: "patente", label: "Patente e strada", icon: "patente" },
  { id: "diritti", label: "Cittadinanza e diritti", icon: "diritti" },
  { id: "salute", label: "Salute e primo soccorso", icon: "salute" },
  { id: "soldi", label: "Soldi, casa e lavoro", icon: "soldi" },
  { id: "digitale", label: "Sicurezza online", icon: "digitale" },
  { id: "italiano", label: "Italiano", icon: "italiano" },
  { id: "english", label: "Inglese", icon: "english" },
  { id: "storia", label: "Storia", icon: "storia" },
  { id: "geografia", label: "Geografia", icon: "geografia" },
  { id: "scienze", label: "Scienze", icon: "scienze" },
  { id: "mate", label: "Matematica", icon: "mate" },
  { id: "arte", label: "Arte e musica", icon: "arte" },
  { id: "civica", label: "Educazione civica", icon: "civica" },
  { id: "modi", label: "Modi di dire", icon: "modi" },
  { id: "locale", label: "Bra e Piemonte", icon: "locale" },
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
  q("locale", TA, "Chi progettò la chiesa di Santa Chiara a Bra, con la sua «cupola diafana»?", ["Bernardo Antonio Vittone", "Filippo Juvarra", "Guarino Guarini", "Francesco Gallo"], "L'architetto Vittone la costruì nel Settecento: la luce filtra dalla doppia cupola."),
  q("locale", TA, "In che anno la Residenza Sabauda di Pollenzo è stata riconosciuta dall'UNESCO?", ["1997", "1962", "2008", "1985"], "Pollenzo fa parte delle Residenze Sabaude, patrimonio UNESCO dal 1997."),
  q("locale", TA, "Quale re di casa Savoia trasformò Pollenzo in una tenuta agricola modello tra il 1832 e il 1848?", ["Carlo Alberto", "Vittorio Emanuele II", "Umberto I", "Carlo Felice"], "Carlo Alberto vi creò una grande azienda agricola con castello, chiesa e cantine."),
  q("locale", ALL, "Quale fiume scorre vicino a Bra e Pollenzo, affluente del Po?", ["Il Tanaro", "Il Ticino", "L'Adige", "La Dora Baltea"], "Il Tanaro passa vicino a Pollenzo e poi si getta nel Po."),
  q("locale", ALL, "Per quale prodotto è famosa nel mondo la città di Alba, vicina a Bra?", ["Il tartufo bianco", "Il pesce azzurro", "Il caffè", "Il riso"], "Il tartufo bianco d'Alba è uno dei più pregiati al mondo."),
  q("locale", TA, "Quale università fondata nel 2004, legata a Slow Food, ha sede a Pollenzo?", ["L'Università di Scienze Gastronomiche", "Il Politecnico", "L'Accademia delle Belle Arti", "L'Università Bocconi"], "Studia il cibo come cultura, scienza ed economia."),
  q("locale", ALL, "Come si chiama la salsa piemontese di acciughe, aglio e olio in cui si intingono le verdure?", ["Bagna càuda", "Pesto", "Salsa verde", "Bagnetto rosso"], "«Bagna càuda» significa «salsa calda» in piemontese."),
  q("locale", ALL, "Quale manifestazione biennale dedicata ai formaggi di qualità si tiene a Bra?", ["Cheese", "Vinitaly", "Salone del Gusto", "Slow Fish"], "«Cheese» ha luogo a Bra ogni due anni, organizzata da Slow Food."),
  q("locale", KT, "Come si chiama la città con la grande torre «Mole Antonelliana»?", ["Torino", "Bra", "Cuneo", "Asti"], "La Mole Antonelliana è il simbolo di Torino e oggi ospita il Museo del Cinema."),
  // ---------- Patente e strada (codice della strada)
  q("patente", TA, "Qual è il limite generale di velocità nei centri abitati?", ["50 km/h", "30 km/h", "60 km/h", "70 km/h"], "Salvo cartelli diversi, nei centri abitati il limite è 50 km/h."),
  q("patente", TA, "Qual è il limite generale sulle strade extraurbane secondarie?", ["90 km/h", "110 km/h", "70 km/h", "130 km/h"], "90 km/h; 110 km/h sulle extraurbane principali e 130 km/h in autostrada."),
  q("patente", TA, "Qual è il limite generale di velocità in autostrada, con tempo buono?", ["130 km/h", "110 km/h", "150 km/h", "120 km/h"], "130 km/h; con la pioggia scende a 110 km/h."),
  q("patente", TA, "Il semaforo diventa giallo: che cosa devi fare?", ["Fermarti, se puoi farlo in sicurezza", "Accelerare per passare", "Passare sempre", "Suonare il clacson"], "Il giallo avvisa che sta per scattare il rosso: ci si ferma, tranne se si è già troppo vicini per frenare in sicurezza."),
  q("patente", TA, "Che cosa indica un segnale rotondo con il bordo rosso?", ["Un divieto", "Un obbligo", "Un pericolo", "Un'indicazione"], "Rotondo con bordo rosso = divieto; rotondo blu = obbligo; triangolare = pericolo."),
  q("patente", TA, "Che cosa indica un segnale triangolare con il bordo rosso?", ["Pericolo", "Divieto", "Obbligo", "Fine di un divieto"], "I triangoli con il bordo rosso avvisano di un pericolo davanti a te."),
  q("patente", ALL, "Che forma ha il segnale di STOP?", ["Ottagonale", "Rotonda", "Triangolare", "Quadrata"], "È l'unico segnale ottagonale: si deve fermarsi e dare la precedenza."),
  q("patente", TA, "Chi deve allacciare la cintura di sicurezza in auto?", ["Tutti gli occupanti", "Solo il conducente", "Solo chi siede davanti", "Solo fuori città"], "La cintura è obbligatoria per tutti, davanti e dietro: riduce moltissimo il rischio in caso di urto."),
  q("patente", TA, "Qual è il tasso alcolemico massimo per un conducente con patente da più di tre anni?", ["0,5 g/l", "0,8 g/l", "1,0 g/l", "0,2 g/l"], "0,5 grammi di alcol per litro di sangue; per i neopatentati e i giovani sotto i 21 anni il limite è zero."),
  q("patente", TA, "Puoi usare lo smartphone tenendolo in mano mentre guidi?", ["No, è vietato", "Sì, se vai piano", "Sì, per le chiamate brevi", "Sì, in autostrada"], "È vietato e molto pericoloso: ti distrai per secondi, come se guidassi a occhi chiusi per decine di metri."),
  q("patente", TA, "A un incrocio senza segnali, chi ha la precedenza?", ["Chi arriva da destra", "Chi arriva da sinistra", "Chi va più veloce", "Chi suona per primo"], "Vale la regola della precedenza a destra."),
  q("patente", TA, "Fuori dai centri abitati, dove cammina un pedone se non c'è il marciapiede?", ["Sul margine sinistro della strada", "Sul margine destro", "Al centro della carreggiata", "Dove vuole"], "Camminando a sinistra vede arrivare i veicoli in faccia e può spostarsi in tempo."),
  q("patente", TA, "Dopo un incidente, che cosa si fa per prima cosa?", ["Mettere in sicurezza la zona e chiamare i soccorsi", "Spostare subito i feriti", "Fotografare le auto", "Andare via"], "Si accendono le quattro frecce, si indossa il giubbino e si chiama il 112. I feriti non vanno spostati."),
  // ---------- Cittadinanza e diritti
  q("diritti", TA, "Chi nomina il Presidente del Consiglio dei ministri?", ["Il Presidente della Repubblica", "Il Parlamento da solo", "Il popolo con un voto diretto", "La Corte costituzionale"], "Lo nomina il Capo dello Stato, e il governo deve ottenere la fiducia di Camera e Senato."),
  q("diritti", TA, "Quanto dura una legislatura, cioè il mandato del Parlamento?", ["5 anni", "4 anni", "7 anni", "10 anni"], "5 anni, salvo scioglimento anticipato delle Camere."),
  q("diritti", TA, "A che età si può essere eletti al Senato?", ["40 anni", "25 anni", "18 anni", "30 anni"], "Al Senato servono 40 anni, alla Camera 25."),
  q("diritti", TA, "Che cos'è il referendum abrogativo?", ["Un voto dei cittadini per cancellare una legge", "Un voto per eleggere il Presidente", "Una nuova legge del governo", "Una sentenza della Corte"], "I cittadini decidono se abrogare una legge; vale se vota almeno la metà più uno degli aventi diritto."),
  q("diritti", TA, "Quale articolo della Costituzione dice che tutti i cittadini sono uguali davanti alla legge?", ["L'articolo 3", "L'articolo 1", "L'articolo 12", "L'articolo 21"], "L'articolo 3 afferma la pari dignità e l'uguaglianza di tutti, senza distinzioni."),
  q("diritti", TA, "Votare, secondo la Costituzione, è…", ["Un dovere civico", "Un obbligo punito con una multa", "Solo un favore ai partiti", "Una scelta senza valore"], "L'articolo 48 lo definisce «dovere civico»: è un diritto e una responsabilità."),
  q("diritti", TA, "Chi controlla che le leggi rispettino la Costituzione?", ["La Corte costituzionale", "Il Parlamento", "Il Presidente del Consiglio", "I sindaci"], "La Corte costituzionale ha 15 giudici e può dichiarare illegittima una legge."),
  q("diritti", ALL, "Che cosa si celebra il 25 aprile?", ["La Liberazione dal nazifascismo", "La nascita della Repubblica", "L'Unità d'Italia", "La Festa dei lavoratori"], "Nel 1945 l'Italia fu liberata dall'occupazione nazista e dal fascismo."),
  q("diritti", ALL, "Che cosa si celebra il 1° maggio?", ["La Festa dei lavoratori", "La Liberazione", "La Repubblica", "L'Epifania"], "Ricorda le lotte per i diritti dei lavoratori, come la giornata di otto ore."),
  q("diritti", TA, "In quale palazzo si riunisce la Camera dei deputati?", ["Palazzo Montecitorio", "Palazzo Madama", "Palazzo Chigi", "Quirinale"], "Montecitorio per la Camera, Palazzo Madama per il Senato, Palazzo Chigi per il governo."),
  // ---------- Salute e primo soccorso
  q("salute", ALL, "Una persona non risponde e non respira: che cosa fai?", ["Chiami il 112 e inizi le compressioni sul torace", "Le dai da bere", "Aspetti che si svegli", "La metti seduta"], "Si chiama subito il 112 e si comincia il massaggio cardiaco: ogni minuto conta."),
  q("salute", TA, "A che ritmo si fanno le compressioni toraciche nella rianimazione?", ["100-120 al minuto", "40-60 al minuto", "60-80 al minuto", "150-200 al minuto"], "Circa due compressioni al secondo, al ritmo di «Stayin' Alive»."),
  q("salute", ALL, "Che cosa fai su una piccola ustione?", ["La raffreddi con acqua corrente fredda", "Ci metti burro o olio", "Ci metti il ghiaccio diretto", "La copri con cotone asciutto"], "Si tiene sotto acqua fredda corrente per diversi minuti; burro e olio peggiorano il danno."),
  q("salute", TA, "Che cosa fai per fermare una ferita che sanguina molto?", ["Premi con una garza pulita sulla ferita", "Lavi senza premere", "Applichi un laccio stretto", "Aspetti che smetta"], "La pressione diretta con una garza o un panno pulito è il primo gesto."),
  q("salute", TA, "Come si chiama la manovra per liberare le vie aeree da un soffocamento?", ["Manovra di Heimlich", "Manovra di Kocher", "Massaggio di Mozart", "Manovra di Torino"], "Si danno colpi tra le scapole e poi compressioni sopra lo stomaco (Heimlich)."),
  q("salute", TA, "Ogni quanti anni si fa il richiamo del vaccino antitetanico?", ["Ogni 10 anni", "Ogni anno", "Ogni 3 anni", "Mai"], "Il richiamo dura 10 anni: protegge dal tetano anche dopo una ferita sporca."),
  q("salute", TA, "Quante ore di sonno servono in media a un adulto?", ["7-9 ore", "4-5 ore", "10-12 ore", "2-3 ore"], "Dormire poco fa male all'attenzione, all'umore e alla salute."),
  q("salute", KT, "Quanto tempo devi lavare le mani con il sapone?", ["Almeno 20 secondi", "2 secondi", "5 secondi", "Basta l'acqua"], "Il tempo di cantare due volte «tanti auguri a te»."),
  // ---------- Soldi, casa e lavoro
  q("soldi", TA, "Che cos'è il codice fiscale?", ["Un codice che identifica ogni persona per il fisco e i servizi", "Il numero della carta di credito", "Il codice della patente", "Il numero del conto in banca"], "Ha 16 caratteri e si usa per tasse, lavoro, sanità e contratti."),
  q("soldi", TA, "Qual è l'aliquota ordinaria dell'IVA in Italia?", ["22%", "10%", "4%", "30%"], "L'IVA, imposta sul valore aggiunto, è del 22%; per alcuni beni è ridotta (10%, 5% e 4%)."),
  q("soldi", TA, "A che cosa serve l'ISEE?", ["Ottenere bonus e agevolazioni in base alla situazione economica", "Pagare l'affitto", "Aprire un conto in banca", "Ottenere il passaporto"], "L'Indicatore della Situazione Economica Equivalente misura reddito e patrimonio della famiglia."),
  q("soldi", TA, "Che cos'è la busta paga?", ["Il documento con stipendio lordo, trattenute e netto", "Un contratto di affitto", "Una carta prepagata", "La lettera di assunzione"], "Mostra quanto guadagni e quante tasse e contributi vengono trattenuti."),
  q("soldi", TA, "Che cos'è lo SPID?", ["L'identità digitale per i servizi online della Pubblica Amministrazione", "Una carta di credito", "Un tipo di contratto", "Un conto corrente"], "Con lo SPID (o la CIE) accedi a INPS, Agenzia delle Entrate, sanità e molto altro."),
  q("soldi", TA, "Che cos'è la PEC?", ["Posta elettronica con valore legale", "Una carta per i pagamenti", "Un tipo di pensione", "Un programma di scrittura"], "La Posta Elettronica Certificata ha valore di raccomandata con ricevuta."),
  q("soldi", TA, "Che cosa indica il TAEG di un prestito?", ["Il costo totale annuo, comprese le spese", "Solo gli interessi", "La durata del prestito", "L'importo della rata"], "Confrontando il TAEG si capisce quale finanziamento costa davvero di meno."),
  q("soldi", TA, "Che cosa significa «interesse composto»?", ["Gli interessi producono altri interessi", "Un interesse che non cambia mai", "Un interesse pagato una volta sola", "Un interesse senza rischi"], "Gli interessi maturati si sommano al capitale e fruttano a loro volta: per questo conviene iniziare presto a risparmiare."),
  q("soldi", TA, "Con quale modello gli italiani, lavoratori dipendenti e pensionati, fanno spesso la dichiarazione dei redditi?", ["Modello 730", "Modello 118", "Modello A4", "Modello F24 soltanto"], "Il 730 è la dichiarazione precompilata dell'Agenzia delle Entrate."),
  q("soldi", TA, "A che cosa serve l'IBAN?", ["A identificare un conto per fare bonifici", "A pagare con il telefono", "A chiedere un mutuo", "A ricaricare il cellulare"], "Il codice IBAN italiano inizia con IT e ha 27 caratteri."),
  // ---------- Digitale e sicurezza online
  q("digitale", ALL, "Che cos'è il phishing?", ["Una truffa che finge di essere qualcun altro per rubare i tuoi dati", "Un gioco online", "Un tipo di pesca", "Un antivirus"], "Falsi messaggi di banche, corrieri o amici che ti chiedono password e codici. Non cliccare i link sospetti."),
  q("digitale", ALL, "Qual è una password sicura?", ["Lunga, con lettere, numeri e simboli, diversa per ogni servizio", "Il tuo nome e la data di nascita", "123456", "La stessa password per tutto"], "Più è lunga e unica, più è difficile da indovinare: un gestore di password aiuta a ricordarle."),
  q("digitale", ALL, "Ricevi un messaggio con un link e una richiesta urgente: che cosa fai?", ["Non clicchi e controlli con il mittente in un altro modo", "Clicchi subito", "Inoltri a tutti", "Dai i tuoi dati"], "L'urgenza è il trucco dei truffatori: fermati e verifica."),
  q("digitale", TA, "Che cosa significa «https» all'inizio di un indirizzo?", ["La connessione con il sito è cifrata", "Il sito è sicuro al 100%", "Il sito è gratuito", "Il sito è italiano"], "Il lucchetto protegge i dati in viaggio, ma anche un sito truffa può averlo: controlla sempre il nome."),
  q("digitale", TA, "A che cosa serve l'autenticazione a due fattori?", ["Aggiunge un secondo controllo oltre alla password", "Raddoppia la velocità", "Cancella i virus", "Serve a salvare le foto"], "Anche se qualcuno scopre la password, senza il codice sul tuo telefono non entra."),
  // ---------- Scuola: Italiano
  q("italiano", KT, "Qual è l'aggettivo nella frase «una casa grande»?", ["grande", "casa", "una", "nessuno"], "L'aggettivo dice com'è il nome: la casa è grande."),
  q("italiano", KT, "Che parte del discorso è «velocemente»?", ["Avverbio", "Aggettivo", "Verbo", "Nome"], "Gli avverbi come «velocemente» spiegano come si fa un'azione."),
  q("italiano", KT, "Qual è il participio passato di «prendere»?", ["preso", "prendato", "prenduto", "prendi"], "Prendere → preso: «ho preso il treno»."),
  q("italiano", TA, "Che figura retorica è «dolce come il miele»?", ["Una similitudine", "Una metafora", "Un'iperbole", "Un ossimoro"], "La similitudine paragona due cose con «come» o «simile a»."),
  q("italiano", TA, "«La pioggia cantava sul tetto» è un esempio di…", ["Personificazione", "Similitudine", "Antitesi", "Onomatopea"], "Si attribuiscono azioni umane (cantare) a una cosa."),
  q("italiano", TA, "Chi scrisse il «Decameron»?", ["Giovanni Boccaccio", "Dante Alighieri", "Francesco Petrarca", "Ludovico Ariosto"], "Boccaccio, nel Trecento: cento novelle raccontate da dieci giovani durante la peste."),
  q("italiano", TA, "Chi scrisse «Il Gattopardo»?", ["Giuseppe Tomasi di Lampedusa", "Italo Svevo", "Luigi Pirandello", "Elsa Morante"], "Il romanzo racconta la Sicilia durante l'unità d'Italia."),
  // ---------- Scuola: Matematica
  q("mate", KT, "Quanto fa 3/4 + 1/4?", ["1", "4/8", "3/8", "2"], "Stesso denominatore: 3 + 1 = 4 quarti, cioè un intero."),
  q("mate", KT, "Qual è l'area di un rettangolo con base 8 e altezza 5?", ["40", "13", "26", "45"], "Area = base × altezza = 8 × 5."),
  q("mate", KT, "Qual è il perimetro di un quadrato di lato 6?", ["24", "12", "36", "18"], "Perimetro = 4 × lato = 4 × 6."),
  q("mate", TA, "Quanto fa 2 elevato alla 5?", ["32", "10", "25", "16"], "2 × 2 × 2 × 2 × 2 = 32."),
  q("mate", TA, "Risolvi: x + 7 = 15. Quanto vale x?", ["8", "22", "7", "9"], "Si sottrae 7 da entrambi i lati: x = 15 − 7."),
  q("mate", TA, "Qual è il massimo comune divisore di 12 e 18?", ["6", "3", "36", "2"], "6 è il numero più grande che divide sia 12 sia 18."),
  q("mate", TA, "In un triangolo rettangolo i cateti misurano 3 e 4: quanto misura l'ipotenusa?", ["5", "7", "6", "12"], "Teorema di Pitagora: 3² + 4² = 9 + 16 = 25, e la radice di 25 è 5."),
  q("mate", ALL, "Quanto è il 10% di 350?", ["35", "3,5", "70", "10"], "Il 10% è un decimo: 350 ÷ 10."),
  // ---------- Scuola: Scienze
  q("scienze", KT, "Quali sono i tre stati della materia?", ["Solido, liquido, gassoso", "Caldo, tiepido, freddo", "Duro, molle, fluido", "Acqua, aria, terra"], "Cambiano con la temperatura: il ghiaccio fonde, l'acqua evapora."),
  q("scienze", TA, "Che cos'è la cellula?", ["L'unità di base di tutti gli esseri viventi", "Una parte del cervello", "Un tipo di batterio", "Un organo"], "Tutti i viventi sono fatti di cellule: alcuni ne hanno una sola, noi miliardi."),
  q("scienze", KT, "Che cosa causa le stagioni?", ["L'inclinazione dell'asse terrestre", "La distanza dalla Luna", "Le nuvole", "Il vento"], "La Terra è inclinata: i raggi del Sole arrivano in modo diverso durante l'anno."),
  q("scienze", KT, "Quale pianeta è famoso per i suoi anelli?", ["Saturno", "Marte", "Venere", "Mercurio"], "Saturno ha anelli di ghiaccio e roccia."),
  q("scienze", TA, "Qual è il simbolo chimico dell'oro?", ["Au", "Or", "Ag", "Go"], "Au viene dal latino «aurum»."),
  q("scienze", TA, "Quale vitamina produce la pelle con il sole?", ["Vitamina D", "Vitamina C", "Vitamina A", "Vitamina B12"], "La vitamina D serve alle ossa: bastano pochi minuti di sole sulla pelle."),
  q("scienze", KT, "Come si chiama il passaggio dell'acqua da liquido a vapore?", ["Evaporazione", "Condensazione", "Solidificazione", "Fusione"], "Il Sole scalda l'acqua e la fa salire come vapore: è l'inizio del ciclo dell'acqua."),
  q("scienze", TA, "Qual è l'unità di misura della forza?", ["Il newton", "Il watt", "Il joule", "Il pascal"], "Si chiama così in onore di Isaac Newton."),
  // ---------- Scuola: Storia e Geografia
  q("storia", TA, "Chi guidò la spedizione dei Mille nel 1860?", ["Giuseppe Garibaldi", "Camillo Cavour", "Giuseppe Mazzini", "Vittorio Emanuele II"], "Garibaldi partì da Quarto con circa mille volontari e conquistò il Sud."),
  q("storia", TA, "Chi fu Camillo Cavour?", ["Primo ministro del Regno di Sardegna e artefice dell'unità", "Un generale", "Un re", "Un poeta"], "Era piemontese: con la diplomazia preparò l'unità d'Italia."),
  q("storia", ALL, "In quale città dell'antica Grecia nacque la democrazia?", ["Atene", "Sparta", "Tebe", "Corinto"], "Ad Atene i cittadini votavano le decisioni nell'assemblea."),
  q("storia", ALL, "Quanti furono i re di Roma, secondo la tradizione?", ["7", "5", "10", "12"], "Da Romolo a Tarquinio il Superbo, poi nacque la Repubblica."),
  q("storia", TA, "Quando cadde il muro di Berlino?", ["1989", "1961", "1975", "2001"], "Nel novembre del 1989: la Germania si riunì l'anno dopo."),
  q("storia", TA, "Che cosa fu il Rinascimento?", ["Un periodo di grande rinnovamento di arte e cultura", "Una guerra", "Una malattia", "Un tipo di governo"], "Nei secoli XV e XVI Leonardo, Michelangelo e Raffaello rinnovarono l'arte."),
  q("geografia", KT, "Qual è il continente più grande?", ["Asia", "Africa", "America", "Europa"], "L'Asia occupa circa un terzo delle terre emerse."),
  q("geografia", ALL, "Qual è la montagna più alta del mondo?", ["Everest", "Monte Bianco", "K2", "Kilimangiaro"], "L'Everest supera gli 8.800 metri, tra Nepal e Tibet."),
  q("geografia", TA, "Qual è il fiume più lungo d'Europa?", ["Il Volga", "Il Danubio", "Il Reno", "La Senna"], "Il Volga, in Russia, è lungo circa 3.500 km."),
  q("geografia", KT, "Quali sono le due isole maggiori d'Italia?", ["Sicilia e Sardegna", "Capri e Ischia", "Elba e Giglio", "Sicilia e Corsica"], "La Sicilia è la più grande del Mediterraneo."),
  q("geografia", KT, "Qual è la capitale della Francia?", ["Parigi", "Lione", "Marsiglia", "Nizza"], "Parigi si trova sul fiume Senna."),
  // ---------- Scuola: Inglese
  q("english", KT, "Come si dice «giallo» in inglese?", ["yellow", "green", "red", "blue"], "Yellow = giallo, green = verde, red = rosso, blue = blu."),
  q("english", KT, "Qual è il plurale di «child»?", ["children", "childs", "childes", "childrens"], "È un plurale irregolare: one child, two children."),
  q("english", KT, "Che cosa significa «I'm hungry»?", ["Ho fame", "Sono arrabbiato", "Sono stanco", "Ho sete"], "Hungry = affamato; thirsty = assetato."),
  q("english", TA, "Qual è il passato di «to eat»?", ["ate", "eated", "eaten", "eat"], "Eat – ate – eaten."),
  q("english", KT, "Come si risponde di solito a «How are you?»", ["I'm fine, thank you", "I am twelve", "Yes, please", "See you"], "Significa «come stai?»: si risponde «sto bene, grazie»."),
  q("english", KT, "Qual è il contrario di «big»?", ["small", "tall", "fast", "cold"], "Big = grande, small = piccolo."),
];

export const bandLabel: Record<Band, string> = { kids: "Elementari", teen: "Medie e superiori", adult: "Adulti" };

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
/** Questions written by the AI today (fetched from the server); they join the built-in bank. */
let daily: Trivia[] = [];
let todayList: Trivia[] = [];
/** The "On this day" questions of today (built from live data). */
export const setTodayTrivia = (list: Trivia[]) => { todayList = list; };
export const setDailyTrivia = (list: Trivia[]) => { daily = list; };
export async function loadDailyTrivia(): Promise<number> {
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch("/api/daily-trivia");
      if (r.status === 200) {
        const list = (await r.json()) as Trivia[];
        if (Array.isArray(list)) setDailyTrivia(list.filter((t) => Array.isArray(t.options) && t.options.length >= 3));
        break;
      }
      if (r.status !== 202) break; // 202 = being written right now: ask again in a moment
      await new Promise((res) => setTimeout(res, 20_000));
    }
  } catch { /* offline or no key: the built-in bank is enough */ }
  return daily.length;
}

const poolFor = (band: Band, topic: Topic | "mix"): Trivia[] =>
  topic === "oggi" ? todayList : [...BANK, ...daily].filter((t) => t.bands.includes(band) && (topic === "mix" || t.topic === topic));

/** How many questions of this age and subject have not been asked recently. */
export const unseenCount = (band: Band, topic: Topic | "mix"): number => {
  const seen = new Set(seenIds());
  return poolFor(band, topic).filter((t) => !seen.has(t.id)).length;
};

/** Picks a question for the player's age group and chosen subject, avoiding the ones seen most recently (null if there are none). */
export function nextTrivia(band: Band, topic: Topic | "mix"): Trivia | null {
  const pool = poolFor(band, topic);
  if (!pool.length) return null;
  const seen = new Set(seenIds());
  const fresh = pool.filter((t) => !seen.has(t.id));
  const from = fresh.length ? fresh : pool;
  const pick = from[Math.floor(Math.random() * from.length)]!;
  markSeen(pick.id);
  return pick;
}

/** Asks the AI (on our server) for more questions of this subject when the player is running out; they are kept for the day. */
export async function loadMoreTrivia(band: Band, topic: Topic | "mix"): Promise<void> {
  if (topic === "oggi") return;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await fetch(`/api/daily-trivia?topic=${topic}&band=${band}`);
      if (r.status === 200) {
        const list = (await r.json()) as Trivia[];
        const have = new Set(daily.map((t) => t.id));
        daily = [...daily, ...list.filter((t) => Array.isArray(t.options) && t.options.length >= 3 && !have.has(t.id))];
        return;
      }
      if (r.status !== 202) return;
      await new Promise((res) => setTimeout(res, 15_000));
    }
  } catch { /* offline or no key: the built-in bank is enough */ }
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
