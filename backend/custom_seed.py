import os
import random
from datetime import date, datetime, time, timedelta
from sqlmodel import Session, select
from database import engine
from models import Patient, TherapySession
from faker import Faker

fake = Faker('it_IT')
Faker.seed(42)
random.seed(42)

def flush_db(session: Session):
    for ts in session.exec(select(TherapySession)).all():
        session.delete(ts)
    for p in session.exec(select(Patient)).all():
        session.delete(p)
    session.commit()

transcripts_templates = [
    # 1. Stress da lavoro
    """T: Buongiorno, come si sente oggi? Ha notato differenze rispetto alla scorsa settimana riguardo alla tensione sul lavoro?
P: Buongiorno. Sì, devo dire che questa settimana è stata un po' un incubo. Il carico di lavoro è aumentato e mi sono ritrovato a fare gli straordinari quasi ogni giorno. Non riesco a staccare la spina.
T: Capisco. Quando dice che non riesce a staccare, si riferisce ai pensieri o c'è anche una sensazione fisica?
P: Entrambe le cose. Fisicamente ho sempre le spalle contratte, e la sera faccio fatica ad addormentarmi perché continuo a pensare alle email a cui non ho risposto. Mi sento in colpa se non sono sempre reperibile.
T: Questo senso di colpa da dove pensa che derivi? È una sua aspettativa o una pressione reale dell'azienda?
P: Un po' entrambe le cose. Il mio capo si aspetta che io risponda subito, ma sono anche io che non voglio sembrare meno efficiente degli altri. Ho sempre questa paura di essere giudicato o di perdere il posto.
T: Ha mai provato a stabilire dei confini chiari? Ad esempio, non controllare le email dopo una certa ora?
P: Ci ho provato, ma dopo dieci minuti l'ansia sale e devo per forza guardare il telefono. È più forte di me. Mi sembra che se non ho tutto sotto controllo, accadrà un disastro.
T: Proviamo ad analizzare questo "disastro". Cosa potrebbe succedere di così catastrofico se lei rispondesse a un'email la mattina seguente invece che alle 22?
P: Razionalmente so che non succederebbe nulla di grave. Forse una piccola strigliata, o forse neanche quella. Ma emotivamente la vivo come un fallimento totale, come se dimostrassi di non essere all'altezza.
T: Lavoriamo su questa distanza tra razionalità ed emotività. Vorrei che provassimo un piccolo esperimento: questa sera, metta il telefono in un'altra stanza per un'ora. Come le sembra?
P: Mi mette già ansia solo a pensarci, ma voglio provare. So che non posso andare avanti così, sono esausto e la mia famiglia inizia a risentirne. Ieri sera ho risposto male a mia moglie senza motivo, ero solo troppo teso.""",

    # 2. Relazioni e Comunicazione
    """T: Come sono andati i giorni scorsi con il suo compagno? Avete avuto modo di parlare di ciò che avevamo discusso?
P: Ci ho provato, ma finiamo sempre per litigare. Ho l'impressione che non mi ascolti veramente. Ogni volta che cerco di spiegare come mi sento, lui la prende come un attacco personale e si mette sulla difensiva.
T: Mi faccia un esempio di come inizia di solito queste conversazioni.
P: Beh, l'altra sera gli ho detto che sono stanca di dover sempre pensare a tutto io in casa. Gli ho fatto notare che se non faccio io la spesa, il frigo rimane vuoto.
T: E lui come ha reagito?
P: Ha alzato la voce dicendo che anche lui lavora ed è stanco. Da lì in poi non si è più capito niente, abbiamo tirato fuori vecchie discussioni di mesi fa e siamo andati a letto senza parlarci.
T: Notiamo il modo in cui è stata posta la questione. Ha usato frasi come "devo sempre pensare a tutto io". Questo tipo di frasi può far scattare l'atteggiamento difensivo. Ha mai provato a usare messaggi in prima persona, parlando dei suoi sentimenti piuttosto che di quello che fa o non fa lui?
P: Intende dire qualcosa tipo "mi sento sopraffatta"?
T: Esattamente. Quando diciamo "mi sento stanca e avrei bisogno di una mano", spostiamo il focus dall'accusa al bisogno. Crede che lui reagirebbe diversamente?
P: Forse sì. Lui non è una cattiva persona, credo che si senta sotto pressione anche lui. Però è così difficile cambiare il modo in cui comunichiamo dopo anni in cui abbiamo sempre fatto così. È diventato un automatismo.
T: È vero, i pattern comunicativi si radicano nel tempo. Richiede sforzo consapevole per cambiarli. Potremmo fare un po' di role-playing su questo: come potrebbe chiedergli aiuto per la spesa usando i "messaggi Io"?
P: Potrei dirgli: "Amore, in questi giorni sono davvero molto stanca dopo il lavoro. Mi aiuterebbe tantissimo se potessi occuparti tu di fare la spesa per questa settimana. Come ti sembra?".
T: Mi sembra un ottimo approccio. Come si sente all'idea di dire queste esatte parole?
P: Mi fa sentire meno arrabbiata e più vulnerabile, ma forse è proprio di questo che c'è bisogno.""",

    # 3. Lutto e Perdita
    """T: Come si è sentita in questi ultimi giorni? L'anniversario della scomparsa di sua madre è stato ieri, giusto?
P: Sì, è stato ieri. È stata una giornata pesantissima. Ho pianto quasi tutto il tempo. Credevo di stare meglio, è passato un anno, pensavo che il dolore si sarebbe un po' attenuato, e invece mi è sembrato di tornare al punto di partenza.
T: Il processo di elaborazione del lutto non è mai lineare. Le date significative, come gli anniversari, sono spesso dei catalizzatori che riportano a galla emozioni molto intense. Non significa che lei sia tornata al punto di partenza.
P: Ma mi sento così debole. I miei amici mi dicono che dovrei andare avanti, che lei non vorrebbe vedermi così triste. E io mi sento in colpa perché non riesco a non essere triste.
T: Sentirsi dire di "andare avanti" può essere molto invalidante, anche se detto con buone intenzioni. Il lutto non ha una data di scadenza. Cosa le manca di più in questo momento?
P: Mi manca poterla chiamare la sera. Era il nostro rituale. Ogni volta che torno da lavoro prendo in mano il telefono, e poi mi ricordo che non c'è più. Quel momento di realizzazione, ogni singola volta, è come una pugnalata.
T: È un vuoto enorme. Quella routine faceva parte della sua struttura quotidiana. Ha pensato a come potrebbe onorare quel momento della sera in modo diverso, mantenendo un legame simbolico con lei?
P: Non lo so. A volte le parlo ad alta voce in macchina, mentre torno a casa. Mi fa sentire un po' ridicola, ma in qualche modo mi aiuta a scaricare la tensione.
T: Non c'è assolutamente nulla di ridicolo in questo. Parlare con chi abbiamo perso è un modo sanissimo per mantenere vivo il legame interiore. Potrebbe provare a scrivere quelle conversazioni? Una sorta di diario indirizzato a lei.
P: Forse potrei provare. Scrivere mi è sempre piaciuto. A volte ho paura di dimenticare la sua voce, sa? Chiudo gli occhi e cerco di ricordarla, ma mi sfugge.
T: È una paura comune. I ricordi cambiano forma nel tempo, ma l'impatto che lei ha avuto sulla sua vita, i valori che le ha trasmesso, quelli rimangono. Su cosa vi confrontavate di solito in quelle telefonate?
P: Su tutto e niente. Le raccontavo i pettegolezzi dell'ufficio e lei mi parlava delle sue piante. Era una normalità così rassicurante. Credo che mi manchi proprio quella sensazione di avere un posto sicuro in cui non dovevo fingere di essere forte.""",

    # 4. Ansia Sociale
    """T: Ha avuto occasione di mettere in pratica l'esercizio di cui abbiamo parlato la volta scorsa? Quello di fare una domanda a un collega in pausa caffè?
P: Purtroppo no. Giovedì c'era l'occasione perfetta, eravamo tutti in sala relax. Ma appena ho pensato di aprire bocca, ho sentito il cuore battere all'impazzata e ho iniziato a sudare. Alla fine ho fatto finta di ricevere una chiamata e sono scappato in bagno.
T: Apprezzo la sua onestà nel raccontarmelo. L'ansia ha preso il sopravvento. Che pensieri le passavano per la testa in quel momento, prima di scappare?
P: Pensavo: "Se dico una cavolata mi prenderanno in giro", "Tutti si accorgeranno che ho la voce che trema", "Meglio stare zitto così non rischio di rendermi ridicolo".
T: E queste previsioni quanto le sembravano vere in quel momento, da 0 a 100?
P: 100. Ero assolutamente convinto che sarebbe andata a finire male.
T: Proviamo ad analizzare le prove. Nelle poche volte in cui è riuscito a parlare in situazioni simili in passato, quante volte l'hanno presa in giro apertamente?
P: Mai. Nessuno mi ha mai riso in faccia. Forse qualcuno una volta non mi ha prestato molta attenzione, ma nessuno mi ha deriso.
T: Quindi c'è una discrepanza tra quello che la sua mente le predice e quello che è effettivamente successo nel passato. Il problema dell'evitamento, come scappare in bagno, è che le impedisce di scoprire che le sue paure sono esagerate.
P: Lo so, capisco la logica, ma fisicamente è insopportabile. Mi sento svenire. Non riesco a controllare le reazioni del mio corpo.
T: Non possiamo controllare l'attivazione fisiologica bloccandola, ma possiamo imparare a tollerarla. Se invece di scappare avesse aspettato un minuto in più, solo sentendo il cuore battere, cosa sarebbe successo?
P: Forse sarei svenuto sul serio?
T: È molto raro svenire per un attacco d'ansia legato alla fobia sociale, perché la pressione sanguigna solitamente sale, non scende. Potremmo provare un'esposizione molto graduale. Magari non fare una domanda, ma solo dire "buongiorno" guardando negli occhi.
P: Solo "buongiorno"? Senza dover aggiungere altro?
T: Esatto. L'obiettivo non è diventare l'anima della festa dall'oggi al domani, ma insegnare al suo cervello che l'interazione sociale non è una minaccia mortale. È disposto a provare questo passo più piccolo?""",

    # 5. Attacchi di Panico e Agorafobia
    """T: Come sono andati gli spostamenti questa settimana? Ha preso la metropolitana?
P: Solo una volta, per tre fermate, e non ero solo. Ma è stato terribile. Ero vicino alla porta, guardavo fuori dal finestrino e pregavo che non si bloccasse in galleria. Quando si è fermata alla stazione successiva, sono sceso subito, anche se non era la mia fermata.
T: Il fatto che sia salito è comunque un successo importante, non lo minimizzi. Cosa l'ha spinta a scendere prima del previsto?
P: Ho sentito quel calore salire dal petto al collo, e la sensazione di non riuscire a respirare. Ho pensato: "Ecco, ci risiamo, sto per avere un infarto o per impazzire". Il bisogno di aria fresca era assoluto.
T: Ha interpretato il sintomo fisico (il calore e il respiro corto) come un pericolo imminente. Nel momento in cui è sceso ed è uscito all'aria aperta, cosa è successo ai sintomi?
P: Sono diminuiti nel giro di cinque minuti. Ma ero esausto, ho dovuto chiamare un taxi per tornare a casa.
T: Il sollievo che ha provato scendendo ha confermato alla sua mente che la metropolitana è pericolosa e che la fuga l'ha salvata. Questo è il meccanismo che mantiene viva l'agorafobia. Dobbiamo spezzare questo ciclo.
P: Ma come faccio se mi sento morire?
T: Imparando a non fuggire mentre il panico è al suo apice. Ne abbiamo parlato: l'attacco di panico ha una curva, sale fino a un picco e poi fisiologicamente scende. Se lei fugge durante la salita, non sperimenta mai la discesa spontanea in quella situazione.
P: E se non scende? Se continuo a stare male fino a svenire?
T: L'attacco di panico consuma moltissima energia, il corpo non può sostenerlo all'infinito. Si esaurisce da solo. La prossima volta, se dovesse succedere, vorrei che provasse a usare la tecnica di respirazione diaframmatica senza scendere.
P: Ci posso provare. È solo che in quel momento il terrore è così accecante che dimentico tutto. Dimentico la respirazione, dimentico quello che ci diciamo qui, voglio solo scappare.
T: Possiamo scrivere le istruzioni su un foglietto da tenere nel portafoglio, o registrarsi un messaggio vocale da ascoltare. Qualcosa che le funga da "ancora" quando l'ansia sale.
P: L'idea dell'audio mi piace. Forse la sua voce, o anche la mia voce che mi ripete cose logiche, potrebbe aiutarmi a non perdere il contatto con la realtà.""",

    # 6. Autostima e Sindrome dell'Impostore
    """T: La scorsa seduta avevamo parlato della sua nuova promozione. Come stanno andando i primi giorni nel nuovo ruolo direttivo?
P: Un disastro, almeno nella mia testa. Sto aspettando solo che qualcuno entri nel mio ufficio e mi dica "Ci siamo sbagliati, non sei tu la persona adatta, torna al tuo vecchio posto".
T: La famosa sindrome dell'impostore. Su cosa si basa questa sua convinzione di non essere adatta?
P: Tutti intorno a me sembrano così sicuri di sé. Sanno sempre cosa dire nelle riunioni, usano termini tecnici perfetti. Io invece mi sento una ragazzina al primo giorno di scuola che finge di essere un'adulta. Faccio il doppio della fatica per prepararmi su ogni singola cosa per non farmi cogliere impreparata.
T: Questo super-prepararsi è una strategia di compensazione tipica. Funziona, perché non viene mai colta impreparata, ma la esaurisce. Le hanno dato questa promozione per caso?
P: Dicono che ho dimostrato eccellenti capacità organizzative e di leadership nei progetti precedenti. Ma io penso sempre che sia stata solo fortuna, o che il progetto fosse facile.
T: C'è la tendenza a minimizzare i propri successi attribuendoli a fattori esterni, come la fortuna, e a massimizzare i propri limiti. Se un suo collega avesse raggiunto i suoi stessi risultati, direbbe che è stato fortunato?
P: Assolutamente no, penserei che è bravissimo e che se lo merita tutto.
T: Vede il doppio standard? È molto più severa con se stessa che con chiunque altro. Da dove pensa nasca questa severità?
P: Probabilmente dall'educazione che ho ricevuto. I miei genitori non celebravano mai i voti alti, dicevano sempre "È il tuo dovere". Se prendevo un 9, chiedevano perché non avevo preso 10.
T: Questo perfezionismo si è interiorizzato. La sua voce interna oggi è il riflesso di quelle richieste. Come possiamo iniziare a rispondere a questa voce?
P: Forse dovrei imparare a riconoscere che ho delle competenze vere. Ma è così difficile crederci sul serio.
T: Iniziamo con i fatti oggettivi. Questa settimana, ogni volta che si sente inadeguata, scriva su un quaderno una cosa che ha fatto bene o un problema che ha risolto con successo sul lavoro.
P: Un diario dei successi. Potrei farlo. In effetti ieri ho risolto un conflitto tra due membri del team senza farla troppo lunga. Forse dovrei annotare cose del genere.""",

    # 7. Ipocondria e Ansia per la Salute
    """T: Quante volte questa settimana ha cercato i suoi sintomi su internet?
P: Purtroppo ho ceduto. Almeno cinque o sei volte. Ho sentito un piccolo formicolio al braccio sinistro e in un attimo ero convinto di avere un principio di sclerosi multipla. Ho passato tutta la notte di mercoledì a leggere forum medici.
T: E dopo aver letto i forum, l'ansia è diminuita o è aumentata?
P: All'inizio sembra placarsi, perché cerco conferme che non sia nulla di grave. Ma poi leggo storie di persone a cui la diagnosi è sfuggita per anni, e l'ansia esplode di nuovo. Poi ho iniziato a controllare continuamente la sensibilità del braccio, pizzicandomi.
T: È il classico circolo vizioso dell'ansia per la salute. Il controllo continuo (il pizzicarsi) e la ricerca di rassicurazioni (internet o medici) mantengono il problema vivo. Facendo così, invia al cervello il messaggio che c'è davvero un'emergenza.
P: Lo so, mi rendo conto che è irrazionale. Ho fatto tutte le visite possibili l'anno scorso e mi hanno detto che sono sano come un pesce, e che i miei sintomi sono psicosomatici. Ma c'è sempre quel pensiero: "E se questa volta fosse vero?".
T: Quel "e se?" è l'esca dell'ansia. Non possiamo avere la certezza assoluta al 100% di nulla nella vita. Dobbiamo imparare a tollerare una piccola percentuale di incertezza. Qual era l'accordo su internet?
P: Niente Google per sintomi fisici. Lo so. Ma è come una dipendenza, ho l'impulso incontrollabile di cercare.
T: Per gestire l'impulso, dobbiamo inserire uno spazio tra lo stimolo (il formicolio) e la risposta (la ricerca). La prossima volta, quando sente l'impulso di cercare su Google, imposti un timer di 30 minuti. Dica a se stesso: "Cercherò, ma tra 30 minuti".
P: E in quei 30 minuti cosa faccio?
T: Si impegna in un'attività che assorba la sua attenzione. Leggere un libro, cucinare, chiamare un amico. L'obiettivo è far passare l'onda dell'urgenza compulsiva. Spesso, dopo 30 minuti, l'ansia è scesa abbastanza da farle scegliere di non cercare.
P: Potrebbe funzionare. Ho notato che se riesco a distrarmi, poi a volte mi dimentico del sintomo fino al giorno dopo.
T: Esattamente. Il sintomo perde di importanza se non gli dà carburante con l'attenzione focalizzata. È disposto a provare la regola dei 30 minuti questa settimana?""",

    # 8. Disturbi Alimentari e Immagine Corporea
    """T: Ha compilato il diario alimentare e delle emozioni come avevamo stabilito?
P: Sì, l'ho portato. Ma mi vergogno molto. Ci sono stati due episodi di abbuffata. Uno martedì sera e uno ieri.
T: Nessun giudizio in questa stanza. L'importante è guardare i dati con curiosità, non con critica. Analizziamo martedì sera. Cosa è successo prima dell'abbuffata?
P: Ero tornata a casa dal lavoro, mi sentivo molto sola. Ho aperto Instagram e ho visto le foto delle vacanze delle mie amiche. Tutte magre, bellissime, perfette. Ho sentito un nodo allo stomaco, mi sono guardata allo specchio e ho provato disgusto.
T: L'emozione prevalente in quel momento era la tristezza, la solitudine o il disgusto per se stessa?
P: Un mix. Soprattutto mi sentivo non amabile. In quel momento ho aperto la dispensa per mangiare un biscotto, e non mi sono più fermata. Quando mangio in quel modo, il cervello si spegne. È come se fossi anestetizzata.
T: Il cibo in quel momento ha funzionato perfettamente: ha spento l'emozione dolorosa di sentirsi "non amabile". Ma l'effetto dura poco, vero?
P: Pochissimo. Dopo subentra il senso di colpa paralizzante. Mi odio ancora di più per aver perso il controllo. E poi decido che il giorno dopo farò un digiuno per compensare.
T: E il ciclo restrizione-abbuffata ricomincia. Se guardiamo il diario, martedì lei aveva pranzato solo con un'insalata scondita per "stare leggera". Fisicamente, il suo corpo era affamato. Unendo la fame fisica al dolore emotivo, l'abbuffata era quasi inevitabile.
P: Quindi mi sta dicendo che devo mangiare di più durante il giorno? Ma ho troppa paura di ingrassare.
T: Capisco la paura, ma la restrizione estrema è il principale innesco fisiologico delle abbuffate. Dobbiamo regolarizzare i pasti per togliere al corpo il segnale di "carestia". Contemporaneamente, lavoreremo su strategie diverse dal cibo per gestire il senso di solitudine.
P: Tipo cosa? Non ho voglia di uscire con nessuno quando mi sento così.
T: Qualcosa di confortante ma non legato all'alimentazione. Un bagno caldo, guardare una serie tv che la rassicura, accarezzare il gatto. Dobbiamo creare un menu di alternative auto-consolatorie.
P: Ci posso provare. E magari dovrei smettere di guardare Instagram quando sono triste, mi fa solo l'effetto di buttarmi giù ancora di più.""",

    # 9. Disturbo Ossessivo Compulsivo (DOC)
    """T: Come procede la riduzione dei controlli serali?
P: È molto difficile. Sono riuscito a non controllare le prese di corrente in sala, ma la porta d'ingresso e il gas della cucina sono ancora un blocco invalicabile.
T: Quante volte controlla la porta d'ingresso attualmente?
P: Dalle cinque alle dieci volte. La chiudo, vado a letto. Poi arriva il pensiero: "E se non ho girato bene la chiave? E se qualcuno entra di notte?". L'ansia diventa insopportabile e mi alzo per controllare di nuovo.
T: E quando controlla, qual è l'obiettivo?
P: Essere sicuro al 100% che sia chiusa. Sentire un clic rassicurante nella mia mente.
T: Ma quel clic arriva mai?
P: A volte sì, dopo molti tentativi. A volte no, e finisco per addormentarmi per sfinimento verso le tre del mattino. Sono stanchissimo, la mia vita è ostaggio di questi rituali.
T: Il DOC richiede certezze assolute che la vita reale non può offrire. Dobbiamo imparare a tollerare il dubbio. Questa settimana vorrei che provassimo la "prevenzione della risposta".
P: Cioè non controllare per niente? Non ce la posso fare, è troppo estremo per me adesso.
T: Non partiamo dal "niente". Partiamo dal ridurre il numero o cambiare la forma. Potrebbe chiudere a chiave la porta una sola volta, scattare una foto con il cellulare e andare a letto. Se arriva il dubbio, guarda la foto invece di alzarsi.
P: Ma il mio cervello dirà: "La foto è vecchia, o magari dopo averla scattata hai riaperto la porta per sbaglio".
T: È vero, la mente ossessiva troverà sempre un "e se". L'obiettivo della foto non è calmare il DOC per sempre, ma introdurre una deviazione nel rituale per spezzare l'automatismo. Una volta accettato questo dubbio, l'ansia si abbasserà fisiologicamente.
P: È sfiancante. Ma capisco che continuare a cedere ai controlli rinforza solo il mostro. Proverò con la foto, mi sembra un compromesso che posso tentare.
T: È un ottimo passo avanti. Deve ricordare che il DOC è come un bullo: più gli dà ragione, più le chiederà in futuro. Ogni piccola ribellione alle sue regole è una vittoria.""",

    # 10. Traumi e PTSD
    """T: L'ultima volta abbiamo parlato dei flashback legati all'incidente. Come sono stati in questi giorni?
P: Frequenti, soprattutto la notte. Ieri è successo anche di giorno. Ero al supermercato e ho sentito un rumore forte, tipo qualcosa di metallico che cadeva. Mi sono bloccata completamente, il respiro si è fermato e per un attimo ho risentito l'odore di bruciato della macchina.
T: Un trigger uditivo ha innescato il ricordo traumatico. Quando si è bloccata, quanto le sembrava reale la sensazione di essere tornata lì?
P: Totalmente reale. Sapevo di essere al supermercato, ma il mio corpo era intrappolato nell'auto. Mi ci sono voluti dieci minuti buoni per tornare in me. Sono scoppiata a piangere nel parcheggio.
T: È una reazione fisiologica comprensibile del sistema nervoso che percepisce una minaccia passata come presente. Quando succede, è importante "ri-ancorarsi" al qui e ora. Ha provato a usare i sensi come le avevo suggerito?
P: Ho provato la tecnica del "5-4-3-2-1", quella di nominare cinque cose che vedo, quattro che tocco, eccetera. Ha funzionato un pochino, mi ha aiutata a riprendere contatto con il pavimento sotto i piedi.
T: È uno strumento eccellente. Più lo usa, più diventerà efficace. Il cervello traumatico ha bisogno di prove tangibili e sensoriali che il pericolo è finito, che lei è salva nel presente.
P: Vorrei solo non avere più queste reazioni. Mi sento difettosa. Le persone intorno a me non capiscono, dicono "è passato un anno, dovresti essertelo messo alle spalle".
T: Il trauma non si cancella con il tempo, ma si integra. Ora la sua amigdala è in uno stato di iper-allerta costante per proteggerla, ma sbaglia i segnali di allarme. Con l'EMDR che inizieremo tra poco, lavoreremo proprio per desensibilizzare questi ricordi dolorosi.
P: Spero che funzioni. A volte evito di uscire in macchina con gli amici proprio per non fare scenate o sembrare pazza. Sto limitando la mia vita.
T: È l'evitamento di cui parlavamo. L'evitamento a breve termine le dà sicurezza, a lungo termine riduce il suo spazio vitale. Non pretenda troppo da se stessa, è in un percorso di guarigione, e richiede coraggio.
P: Mi impegnerò con gli esercizi di grounding questa settimana, voglio provare a riprendere un po' il controllo.""",

    # 11. Rabbia e Gestione degli Impulsi
    """T: Rivediamo l'episodio di martedì in ufficio. Cosa l'ha fatta esplodere in quel modo durante la riunione?
P: Il mio collega mi ha interrotto per l'ennesima volta mentre stavo presentando il report. Lo fa sempre, con quel sorrisetto di superiorità. Non ci ho visto più. Ho sbattuto le mani sul tavolo e gli ho urlato di stare zitto. Davanti a tutti.
T: Subito dopo averlo fatto, come si è sentito?
P: Per due secondi, onnipotente. Un senso di liberazione totale. Ma subito dopo, quando è calato il silenzio nella stanza e tutti mi guardavano sconvolti, ho provato una vergogna indicibile. Ora rischio un richiamo ufficiale.
T: La rabbia funziona spesso così: un sollievo immediato seguito da conseguenze dannose a lungo termine. Proviamo a riavvolgere il nastro. Prima dell'esplosione, c'erano stati dei segnali fisici di attivazione?
P: Sì, mi stava battendo forte il cuore e sentivo i muscoli del collo contratti. Stringevo la penna così forte che quasi la spezzavo. Ma in quel momento non ci faccio caso.
T: Questo è il punto chiave. Quei segnali sono i suoi semafori gialli. Quando la rabbia arriva al rosso, la corteccia prefrontale (la parte razionale) si "spegne" e agisce solo d'impulso. Dobbiamo intervenire al giallo.
P: E cosa dovrei fare? Se qualcuno mi manca di rispetto non posso semplicemente fare un respiro profondo e sorridere come un ebete.
T: Certo che no. Non si tratta di reprimere la rabbia o di subire passivamente, ma di canalizzarla in modo assertivo anziché aggressivo. Quando si accorge dei segnali fisici, può prendersi una pausa, anche solo bere un sorso d'acqua. E poi dire con fermezza: "Ti prego di non interrompermi, non ho finito di parlare".
P: A parole sembra facile, ma in quel momento vedo rosso.
T: Richiede pratica, come allenare un muscolo. Possiamo lavorare sull'identificazione precoce dei trigger. Quali sono i pensieri che le fanno "vedere rosso"?
P: Il pensiero che nessuno mi rispetti, che tutti cerchino di mettermi i piedi in testa e sminuire il mio lavoro. Se non mi difendo attaccando per primo, mi distruggeranno.
T: Questa è una convinzione molto forte. Deriva forse da esperienze passate in cui si è sentito davvero minacciato e indifeso?
P: Sì, mio padre era un tipo autoritario, in casa si faceva come diceva lui, chi si mostrava debole veniva sopraffatto.""",

    # 12. Fobia Specifica (Volo)
    """T: Ha fissato la data per il volo verso Londra o sta ancora procrastinando?
P: Sto procrastinando. Solo l'idea di comprare il biglietto mi dà la nausea. Il mio compagno ci terrebbe tanto, ma non riesco a immaginare di salire su quel tubo di metallo sospeso nel nulla.
T: Qual è l'immagine peggiore che le viene in mente pensando al volo?
P: Che l'aereo precipiti, ovviamente. Immagino le turbolenze forti, le maschere dell'ossigeno che scendono, il panico a bordo. È fuori dal mio controllo. Guidando la macchina, almeno, sono io al volante.
T: Il bisogno di controllo è centrale in questa fobia. C'è una distorsione cognitiva molto comune: sopravvalutiamo il pericolo di situazioni su cui non abbiamo controllo diretto (l'aereo) e sottovalutiamo quelle controllabili (la macchina), anche se statisticamente l'aereo è molto più sicuro.
P: Lo so razionalmente, i numeri li ho letti tutti. Ma quando sono lì, seduta su quel sedile, la logica svanisce. Ho paura di fare un attacco di panico a 10.000 metri di quota e non poter fuggire.
T: Questa è ansia anticipatoria ed è spesso legata alla paura della paura stessa. La paura di avere un attacco di panico diviene il problema primario. Ha mai pensato di seguire uno dei corsi offerti dalle compagnie aeree per la paura di volare?
P: Me l'hanno consigliato. Spiegano i rumori dell'aereo, la fisica del volo. Forse capire cosa succede a livello tecnico potrebbe tranquillizzarmi.
T: Aiuta a decatastrofizzare. Un suono insolito per lei è un segnale di allarme mortale, per il pilota è solo il carrello che si ritira. La conoscenza riduce l'incertezza.
P: Però il passo di prendere il biglietto devo farlo io. Forse potremmo stabilire un piano graduale? Non lo so, guardare dei video di decolli?
T: Ottima idea, si chiama desensibilizzazione sistematica. Questa settimana, il compito è guardare video di decolli su YouTube per 10 minuti al giorno. Deve annotare il suo livello di ansia da 0 a 10 prima, durante e dopo. Come le sembra?
P: Fattibile. Posso sempre chiudere il video se sto troppo male.""",

    # 13. Procrastinazione e Difficoltà di Pianificazione
    """T: Come è andata con la stesura della tesi in questi giorni? È riuscito a seguire la suddivisione in piccoli blocchi che avevamo deciso?
P: Un disastro. L'intenzione c'era tutta, mi sono anche svegliato presto. Ma poi ho pensato di dover prima pulire la scrivania, poi sistemare i file nel computer... e si è fatta sera. Alla fine ho scritto mezza pagina e mi sento in colpa.
T: Si è perso in attività preparatorie. È un classico meccanismo di evitamento della procrastinazione. Cosa provava quando si sedeva davanti al foglio bianco?
P: Un senso di oppressione, come se dovessi scalare l'Everest. Mi sembrava impossibile scrivere qualcosa di intelligente e ben fatto. Più ci pensavo, più sentivo il bisogno di fare qualcosa di semplice, come pulire, per sentirmi produttivo.
T: Il perfezionismo paralizza l'azione. L'ansia di dover fare tutto in modo perfetto rende l'inizio del compito così sgradevole che il cervello cerca una gratificazione istantanea altrove. Dobbiamo abbassare l'asticella delle aspettative iniziali.
P: Ma la tesi deve essere scritta bene.
T: Certamente, alla fine. Ma la prima bozza può, e anzi deve, essere imperfetta. Ernest Hemingway diceva che "la prima bozza di qualsiasi cosa è spazzatura". Se le dessi il permesso di scrivere per 20 minuti nel modoPeggiore possibile, solo buttando giù idee senza correggere, riuscirebbe a farlo?
P: Scrivere male apposta? Sembra strano. Però toglierebbe un bel po' di pressione.
T: Si chiama "pomodoro technique" applicata a una bozza orribile. Imposta un timer di 25 minuti. In quei minuti deve scrivere senza fermarsi, senza correggere refusi, senza giudicare la sintassi. Quando suona, si ferma. L'obiettivo non è la qualità, è rompere il muro dell'inerzia.
P: Questo penso di poterlo fare. È come togliere l'importanza al compito per ingannare il mio cervello.
T: Esatto, stiamo ingannando il blocco emotivo. Spesso, una volta iniziato, l'inerzia la porta a continuare per inerzia positiva. Vogliamo sconfiggere la difficoltà di attivazione iniziale.
P: Devo provare. Questa sensazione di essere bloccato e non concludere nulla mi sta deprimendo profondamente, mi sento un fallito totale rispetto ai miei compagni di corso.""",

    # 14. Problematiche di Confini Familiari
    """T: L'ultima volta avevamo ipotizzato di dire "no" a sua madre riguardo al pranzo della domenica. Ci è riuscita?
P: Ci ho provato. Le ho detto che questo fine settimana io e mio marito volevamo restare a casa a riposare. Ha fatto una tragedia. Ha detto che non ci vediamo mai, che lei sta invecchiando e che noi la escludiamo.
T: E lei come si è sentita di fronte a queste parole?
P: Una figlia orribile. Il senso di colpa mi ha completamente travolta. Alla fine le ho detto che saremmo andati, anche se solo per un'ora. Ho ceduto, come sempre.
T: Il ricatto emotivo è potente. Sua madre ha toccato i tasti del senso di colpa per ottenere ciò che voleva, e ha funzionato. Cosa sarebbe successo se, invece di cedere, avesse mantenuto la posizione in modo affettuoso ma fermo?
P: Probabilmente mi avrebbe tenuto il broncio per settimane. E avrebbe fatto chiamare mio fratello per farmi la ramanzina. È un copione che conosco a memoria.
T: Mettere dei confini a persone che non sono abituate a rispettarli genera sempre una ribellione iniziale, che noi chiamiamo "tempesta di estinzione". Peggiorano il comportamento prima di accettare la nuova regola. Deve essere pronta a tollerare il suo broncio senza farsi carico delle sue emozioni.
P: Non so se sono abbastanza forte. È come se il suo benessere dipendesse totalmente da me.
T: È proprio questa l'illusione che dobbiamo smantellare. Lei è responsabile dei suoi comportamenti verso sua madre, non delle emozioni di sua madre. Se dice "no" con gentilezza e rispetto, ha fatto il suo. Come lei reagisce è un problema suo, non di lei.
P: Suona duro.
T: Suona differenziato. Fino a quando eviterà di mettere confini per non sentirsi in colpa, accumulerà rancore verso di lei. E il rancore danneggia le relazioni molto più di un "no". Proviamo a costruire una frase assertiva per la prossima volta.
P: Tipo: "Mamma, so che ci tieni molto al pranzo della domenica e ti voglio bene, ma questo fine settimana ho bisogno di riposare a casa. Ci vedremo il prossimo"?
T: Perfetta. Valida i sentimenti di sua madre, ma mantiene saldo il limite. La parte difficile sarà non aggiungere giustificazioni extra o scuse.""",

    # 15. Insonnia e Iperattivazione Notturna
    """T: Come va con il sonno? Sta rispettando la regola di alzarsi dal letto se non riesce a dormire entro venti minuti?
P: Ci provo, ma a volte sono così stanco fisicamente che l'idea di alzarmi mi pesa. Resto a letto a rigirarmi, guardo l'orologio, calcolo quante ore mi restano prima che suoni la sveglia, e l'ansia cresce a dismisura.
T: Guardare l'orologio è il peggior nemico di chi soffre di insonnia. Trasforma il sonno da un processo naturale in una performance matematica. "Se mi addormento ora, dormirò 4 ore e 12 minuti... sarò uno straccio domani".
P: È esattamente quello che penso! E più ci penso, più il cuore accelera e il cervello sembra accendersi come un flipper.
T: Il letto sta diventando un campo di battaglia invece che un luogo di riposo. Per questo è fondamentale alzarsi. Se resta a letto frustrato, il cervello associa il materasso all'ansia e allo sforzo. Dobbiamo ricostruire l'associazione letto-sonno.
P: E quando mi alzo, cosa dovrei fare? Spesso vado sul divano a scrollare Instagram, ma credo non aiuti.
T: Assolutamente no, la luce blu degli schermi inibisce la produzione di melatonina. Deve fare un'attività noiosa e rilassante, con una luce fioca. Leggere un libro che non sia troppo avvincente, fare un puzzle, ascoltare musica rilassante.
P: E torno a letto solo quando ho sonno?
T: Solo quando sente le palpebre pesanti. Se torna e non si addormenta di nuovo, si rialza. Anche se dovesse farlo cinque volte in una notte. Il suo corpo deve reimparare che il letto serve solo per dormire. Ha girato o nascosto la sveglia come suggerito?
P: Non ancora, ho paura che non suoni.
T: Mettiamo il telefono girato a faccia in giù o l'orologio rivolto verso il muro. La sveglia suonerà lo stesso, ma lei non potrà monitorare il tempo che passa. Questo è un "compito" non negoziabile per questa settimana.
P: D'accordo, nasconderò l'orologio. È snervante affrontare la giornata essendo costantemente esausto. Il mio rendimento sul lavoro sta crollando.
T: L'insonnia genera un circolo vizioso: la paura delle conseguenze sul lavoro il giorno dopo le causa ansia la notte, che a sua volta le impedisce di dormire. Lavoreremo su entrambi i fronti.""",

    # 16. Transizione di Fase di Vita
    """T: La laurea è ormai passata da due mesi. Come si sente in questa nuova fase di "vuoto" prima della ricerca del lavoro?
P: Mi sento perso. Per cinque anni la mia identità è stata "lo studente". Avevo obiettivi chiari: dare esami, laurearmi. Ora che ho finito, pensavo di sentirmi libero, invece mi sento cadere nel vuoto.
T: L'ansia da transizione. La struttura esterna che organizzava il suo tempo e le dava un senso di direzione è svanita, e ora deve crearne una interna. È una delle sfide più grandi.
P: I miei amici sembrano tutti sapere cosa vogliono fare. Chi manda curriculum, chi fa master all'estero. Io mi sveglio tardi, passo le giornate a pensare a cosa fare, e finisco per non fare nulla. E mi sento in colpa per non essere produttivo.
T: Ha mai preso in considerazione l'idea di concedersi intenzionalmente un periodo di riposo, senza sensi di colpa? Una sorta di transizione attiva prima di buttarsi nel mercato del lavoro?
P: Mi sembra tempo perso. Devo trovare lavoro, la società impone questo.
T: Certo, ma inviare curriculum in preda al panico e senza una direzione chiara raramente porta a scelte soddisfacenti. Se questo periodo di "vuoto" non fosse un errore, ma uno spazio per conoscersi meglio fuori dall'ambiente accademico?
P: Sarebbe bello poterlo vivere così, ma i miei genitori iniziano a fare battutine sul mio stare sempre in casa. Questo mi mette una pressione addosso che mi paralizza ancora di più.
T: È importante comunicare con loro. Potrebbe spiegare che ha deciso di prendersi, ad esempio, quattro settimane di pausa per riprendersi dallo sforzo della tesi e definire con lucidità i suoi obiettivi. Mettere un termine temporale chiaro riduce l'ansia a loro e a lei.
P: Fissare una data... sì, questo potrebbe aiutare. Mi darebbe il permesso di riposare senza sentirmi giudicato come un fannullone in eterno.
T: Creiamo una piccola routine temporanea per non scivolare nell'apatia. Alzarsi a un'ora fissa, dedicare un'ora a un hobby o allo sport, e un piccolo tempo all'esplorazione dei propri interessi per il futuro. Nessun curriculum per un mese, solo esplorazione.""",

    # 17. Isolamento Sociale
    """T: Nelle ultime settimane abbiamo parlato del suo senso di solitudine in questa nuova città. Ha provato a frequentare qualche ambiente nuovo?
P: Sono andato in palestra un paio di volte, ma faccio i miei esercizi e vado via. Tutti hanno già il loro gruppo di amici, le cuffiette alle orecchie, sembra impossibile attaccare bottone con qualcuno.
T: La palestra, soprattutto nelle grandi città, è spesso un luogo dove le persone cercano l'isolamento piuttosto che la socializzazione. Che altri interessi ha che potrebbero prestarsi meglio a un'interazione strutturata?
P: Mi piacevano molto i giochi da tavolo, anni fa avevo un gruppo fisso al mio paese. E poi la fotografia, anche se sono un dilettante.
T: Entrambi ottimi spunti. I gruppi di fotografia o i club di giochi da tavolo sono "facilitatori sociali". Le persone partecipano proprio per interagire attorno a un'attività comune, abbattendo la barriera dell'iniziare una conversazione dal nulla.
P: Ho cercato online qualche evento, ma l'idea di presentarmi da solo in un posto dove non conosco nessuno mi blocca. Penso sempre: e se sembro uno sfigato disperato che cerca amici?
T: È una distorsione cognitiva molto comune. In realtà, la maggior parte delle persone ammira chi ha il coraggio di presentarsi da solo a un evento nuovo. Provi a immaginare di essere già in quel club e di vedere arrivare un ragazzo nuovo da solo. Cosa penserebbe di lui?
P: Penserei: "Bravo, ha fatto bene a venire, speriamo si trovi bene". Non penserei mai che è uno sfigato.
T: Ecco, applichiamo a noi stessi la stessa benevolenza che applichiamo agli altri. Questa settimana le chiedo di identificare un evento specifico (fotografia o giochi da tavolo), informarsi sugli orari, e andarci. Non le chiedo di fare amicizie durature, solo di essere presente per un'ora.
P: Devo solo resistere all'impulso di cancellare tutto all'ultimo minuto. Quando si avvicina il momento, trovo sempre mille scuse per restare a casa sul divano al sicuro.
T: Sappiamo che l'evitamento riduce l'ansia a breve termine ma rafforza la gabbia della solitudine a lungo termine. Possiamo stabilire un "piano d'azione": come si comporterà giovedì sera quando la mente inizierà a suggerirle di non andare?""",

    # 18. Stress Finanziario
    """T: Come si sente a parlarne in modo più diretto oggi? Le questioni finanziarie sono spesso un tabù difficile da rompere.
P: Mi vergogno profondamente. Avere debiti a questa età mi fa sentire un fallito. Non dormo la notte pensando alle rate da pagare, apro le lettere della banca con il cuore in gola. Ho smesso di uscire a cena con gli amici inventando scuse assurde.
T: Tenere il segreto alimenta la vergogna e il senso di isolamento. Con chi ha parlato di questa situazione finora, a parte me?
P: Nessuno. Non potrei mai dirlo ai miei genitori, si preoccuperebbero a morte, o peggio, mi giudicherebbero per aver speso oltre le mie possibilità in passato. E alla mia compagna non voglio mostrare questo lato di me, deve pensare che io sia una persona stabile.
T: Questo peso è troppo grande per essere portato in solitudine. Lo stress cronico che sta subendo la porta a un affaticamento mentale continuo. Nascondere le cose a sua moglie, inoltre, crea una distanza emotiva nella coppia. Ha notato cambiamenti nel vostro rapporto?
P: Sì, sono più scontroso, distante. Lei mi chiede se c'è un'altra donna o se non l'amo più. E io non so cosa risponderle senza svelare la verità.
T: Ironia della sorte, per proteggerla da una preoccupazione finanziaria, sta creando una crisi relazionale che forse è molto più dolorosa per lei. I problemi pratici si possono risolvere con piani di rientro, la mancanza di fiducia è più difficile da riparare.
P: Lo so, ma il momento di parlarne mi terrorizza. Ho paura della sua reazione. Potrebbe lasciarmi per la mia irresponsabilità.
T: È una possibilità, la paura è legittima. Ma un'unione forte si basa sull'affrontare le difficoltà insieme. Potremmo preparare insieme il discorso. Non deve scaricarle addosso il problema, ma presentarle la situazione in modo adulto, mostrando che ha già un piano per risolverla.
P: Forse se arrivo dicendo: "Ho fatto degli errori in passato, ecco a quanto ammonta il debito, ed ecco come ho intenzione di ripianarlo", potrebbe essere meno traumatico.
T: Esattamente. Affrontare il problema proattivamente diminuisce la percezione di debolezza. Facciamo una simulazione di questo colloquio oggi, vediamo quali emozioni emergono.""",

    # 19. Problemi di Autoregolazione Emotiva (Borderline Traits)
    """T: Ripercorriamo quello che è successo nel weekend. Mi accennava al telefono a una crisi profonda.
P: Sì, sabato notte. Il mio ragazzo non ha risposto ai messaggi per tre ore. Sapevo che era a una cena con i colleghi, ma la mia mente è partita. Ho iniziato a pensare che non gli importava di me, che si stava annoiando della nostra storia, che forse c'era un'altra.
T: E come ha agito spinta da questi pensieri?
P: L'ho bombardato di chiamate, gliene ho fatte tipo venti. Alla fine lui ha risposto molto arrabbiato, mi ha detto che lo stavo soffocando e ha spento il telefono. Lì mi è crollato il mondo addosso, ho pianto disperatamente sul pavimento, ho sentito un dolore fisico al petto, un vuoto insopportabile.
T: La percezione dell'abbandono scatena un'angoscia estrema, che porta a comportamenti impulsivi (le chiamate continue) che, purtroppo, finiscono spesso per allontanare davvero l'altra persona. Che cosa ha fatto per gestire quel dolore acuto?
P: Ho bevuto quasi mezza bottiglia di vino. Mi ha intorpidita abbastanza da farmi crollare addormentata. Ma la domenica mattina l'ansia era dieci volte peggio, mista ai sensi di colpa.
T: L'alcol è un regolatore emotivo disfunzionale a lunghissimo termine. Abbiamo parlato in passato del "Mindful Tolerance" e del pacchetto di crisi della Terapia Dialettico Comportamentale. In quel momento di angoscia totale, cosa avrebbe potuto fare al posto di bere o di chiamare compulsivamente?
P: Non so, usare il freddo? Quella roba del ghiaccio in faccia di cui mi aveva parlato?
T: Sì, l'attivazione del riflesso di immersione (TIPP). Mettere la faccia in una bacinella di acqua fredda abbassa istantaneamente la frequenza cardiaca e resetta parzialmente il sistema nervoso autonomo. È un'azione fisica forte che interrompe il loop del panico.
P: Sembra pazzesco, ma se serve a non distruggere le mie relazioni, lo farò. Solo che devo ricordarmelo prima di arrivare al punto di non ritorno.
T: Esatto. Deve scrivere il protocollo d'emergenza e appenderlo al frigo. Quando sente che il panico da abbandono sale oltre quota 70 su 100, niente telefono, niente decisioni relazionali. Solo strategie fisiche: freddo, esercizio intenso o respirazione ritmata.""",

    # 20. Difficoltà a dire di No (People Pleasing)
    """T: Quindi ha accettato di fare anche questo turno extra nel fine settimana, rinunciando alla gita che aveva programmato?
P: Sì. Il mio collega mi ha chiesto il favore implorandomi, dicendo che aveva un problema in famiglia. Non me la sono sentita di dire di no. E ora io e mia moglie stiamo litigando furiosamente perché ho dovuto annullare il nostro weekend in montagna.
T: Quanto le è costato, in termini di energia e benessere, questo "sì"?
P: Tantissimo. Sono furioso con me stesso, furioso con il mio collega che se ne approfitta sempre, e frustrato per aver deluso mia moglie di nuovo. È il classico "bravo ragazzo" che si fa mettere i piedi in testa.
T: Mettiamo a fuoco il momento esatto della richiesta. Quando le ha chiesto il turno, che pensiero le è passato per la testa in quella frazione di secondo?
P: Che se avessi detto di no, avrei creato un problema, lui avrebbe pensato che sono uno stronzo egoista, e il clima in ufficio sarebbe diventato pesante. L'ansia del potenziale conflitto era troppo alta.
T: Il "people pleasing" nasce spesso come strategia di sopravvivenza infantile per evitare conflitti e mantenere un senso di sicurezza. Ma da adulti diventa una trappola. Dire "sì" agli altri significa spesso dire "no" a noi stessi o a chi amiamo di più, come in questo caso a sua moglie.
P: È verissimo. Evito il conflitto con i conoscenti e finisco per scaricarlo in casa con mia moglie, perché con lei mi sento più sicuro e so che non mi abbandonerà. È ingiusto.
T: È una consapevolezza dolorosa ma fondamentale. Per imparare a dire di no, dobbiamo costruire la tolleranza al disagio del disappunto altrui. È disposto a sopportare che un collega sia infastidito per qualche giorno, pur di proteggere la serenità della sua famiglia?
P: Razionalmente sì. Emotivamente faccio fatica. Avere qualcuno arrabbiato con me mi fa sentire in colpa.
T: Iniziamo con i piccoli "no". L'obiettivo di questa settimana non è dire un no enorme sul lavoro, ma trovare tre piccole occasioni in cui affermare le proprie preferenze. Un amico propone un ristorante che non le piace? Proponga lei un'alternativa. Direzioni di piccole azioni verso se stesso."""
]

def generate_custom_data():
    with Session(engine) as session:
        flush_db(session)

        # Create 30 patients (20 active, 10 dismissed)
        patients = []
        for i in range(30):
            is_active = i < 20
            p = Patient(
                name=fake.first_name(),
                surname=fake.last_name(),
                age=random.randint(22, 65),
                condition=random.choice(["Ansia", "Depressione", "Disturbo Bipolare", "Stress", "Disturbo Ossessivo Compulsivo", "PTSD", "Fobia sociale"]),
                status="Active" if is_active else "Dismissed",
                is_active=is_active,
                address=fake.address(),
                email=fake.email(),
                phone=fake.phone_number()
            )
            session.add(p)
            session.commit()
            session.refresh(p)
            patients.append(p)
        
        active_patients = [p for p in patients if p.is_active]

        # Create 20 therapy sessions with max 2500 chars transcripts (no summary)
        # We have 20 transcripts templates
        past_sessions = []
        today = date.today() # 2026-05-10
        
        for idx, t_text in enumerate(transcripts_templates):
            # assign to a random active patient
            p = random.choice(active_patients)
            # random past date within last 30 days
            days_ago = random.randint(1, 30)
            session_date = datetime.combine(today - timedelta(days=days_ago), time(hour=random.randint(9, 18), minute=0))
            
            ts = TherapySession(
                patient_id=p.id,
                date=session_date.isoformat() + "Z",
                start_time=session_date.strftime("%H:%M"),
                end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                approved=True,
                transcript=t_text,
                clinical_note=None # User requested NO summary
            )
            session.add(ts)
        
        # Create 10 booked therapy sessions (5 today May 10, 5 future)
        today_date_str = today.isoformat() + "Z" # '2026-05-10T00:00:00Z'
        
        for i in range(10):
            p = random.choice(active_patients)
            
            if i < 5:
                # Today May 10
                session_date = datetime.combine(today, time(hour=9 + i, minute=0))
            else:
                # Future
                days_ahead = random.randint(1, 14)
                session_date = datetime.combine(today + timedelta(days=days_ahead), time(hour=random.randint(9, 18), minute=0))
                
            ts = TherapySession(
                patient_id=p.id,
                date=session_date.isoformat() + "Z",
                start_time=session_date.strftime("%H:%M"),
                end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                approved=False,
                transcript=None,
                clinical_note=None
            )
            session.add(ts)
        
        session.commit()
        print("Database successfully seeded with custom requested data.")

if __name__ == "__main__":
    generate_custom_data()
