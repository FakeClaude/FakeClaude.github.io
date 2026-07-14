import { h } from "preact";
import "./about.css";

const aboutTranslations = {
  en: {

  what_title: "What is PossMap?",
  what_text: "PossMap is a dynamic causal probability mapping platform based on time-series Bayesian inference, allowing users to create proposition events without logging in. As users continuously inject news events into a proposition, each new event recalibrates the proposition's probability according to Bayesian logic.",

  logic_title: "Bayesian Probability Logic",
  logic_steps: [
    "The standard Bayes' theorem formula: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Here H represents a proposition event (e.g. \"Germany wins the championship\"), E represents a newly emerged news event (e.g. \"the captain is injured\"), ¬H means the proposition does not hold (\"Germany does not win\"), and P(H|E) is the probability that the proposition holds given this news event.",

    "PossMap's calculation formula: Odds = P ÷ (1 − P); Odds_new = Odds_old × LR; P_new = Odds_new ÷ (1 + Odds_new). The likelihood ratio (LR) can be intuitively understood through a \"parallel universes\" framing — imagine two parallel universes, one where the proposition holds true and one where it does not. LR is the probability of this news event occurring in the universe where the proposition holds, divided by the probability of it occurring in the universe where the proposition does not hold. An LR greater than 1 means the news is more common in the world where the proposition is true, making it supporting evidence; an LR less than 1 means it's more common in the world where the proposition is false, making it opposing evidence. No matter how many pieces of such evidence are stacked, the final probability always stays between 0% and 100% — and the closer the probability gets to either extreme, the smaller the actual impact of news of the same strength becomes automatically. This reflects the real-world phenomenon of diminishing marginal returns from evidence.",

    "Worked example: The proposition \"Germany wins the championship\" currently sits at 60% probability, corresponding to Odds = 60 ÷ 40 = 1.5. A news event then appears: \"the captain is injured.\" We evaluate the probability of this news occurring from the perspective of each parallel universe: in the universe where Germany ultimately wins, the probability of the captain being injured is roughly 80%; in the universe where Germany does not win, that probability is roughly 40%. This gives LR = 80% ÷ 40% = 2, indicating the news is more common in the \"championship\" world and counts as supporting evidence. The updated Odds = 1.5 × 2 = 3, corresponding to a new probability P = 3 ÷ (1+3) = 75%. If a strongly opposing piece of evidence then appears with LR = 0.3, Odds = 3 × 0.3 = 0.9, bringing the probability back down to roughly 47.4%.",

    "How to enter values: All you need to do is assign a target percentage to a news event — for instance, entering \"−2%\" for \"the captain is injured.\" The system treats this figure as the target posterior probability = 60% − 2% = 58% (target Odds ≈ 1.381). By dividing the target Odds by the current Odds, the system can back-derive the single likelihood ratio (LR ≈ 0.92) uniquely corresponding to this news event — one equation, one unknown, so you never need to supply the two parallel-universe probabilities yourself. What the system actually stores and uses in calculations is this LR value, not the original \"−2%\" figure; subsequent news events are multiplied onto the Odds in sequence, and the probability trend chart is recalculated accordingly.",

      "Display precision note: To keep the change percentage clear and readable, it is rounded to the nearest 0.1%. If a piece of news causes a real shift smaller than 0.05% (which would round to 0.0%), the system forces it to display as the minimum unit of ±0.1% in the correct direction, avoiding the misleading impression of \"no change\" when something actually happened. This only affects how the event probability, the change percentage, and the trend chart are displayed — the underlying probability and change used in the Bayesian calculation are not affected. However, when the probability has already reached the 0% or 100% boundary and there's no more room to display further movement (e.g. it's already showing 100.0% and another piece of news still supports it), it will display as 0.0%."

  ],

  cook_title: "Privacy Policy",
  cook_steps: [
    "PossMap can be used without registration or login. We do not collect personally identifiable information such as your name, email address, or phone number. To allow you to edit or delete content you've submitted, the system generates a random anonymous identifier locally on your device (stored in your browser's localStorage). This identifier is used only to determine \"whether this content was submitted by you\" — it is not used for any other purpose and is never linked to any real-world identity.",

    "Propositions, news events, and the corresponding evidentiary text you create on PossMap are public content, visible to all visitors. Please do not include other people's private information or sensitive data in anything you submit.",

    "We use Google Firebase to provide data storage, website hosting, and basic access analytics services. Related data processing follows Firebase's own privacy and security policies.",

    "We do not use any cookies for ad targeting or cross-site tracking.",
  ],

  contact_title: "Contact Us",
  contact_text: "Feedback:",
},
  zh: {

    what_title: "PossMap 是什么？",
    what_text: "PossMap 是一款无需登录即可创建命题事件的、基于时序贝叶斯推断的动态因果概率映射平台。用户通过创建命题事件，并持续注入新闻事件，每一次新闻事件的加入都会让命题事件概率沿贝叶斯概率逻辑校准。",

    logic_title: "贝叶斯概率处理逻辑",
    logic_steps: [
      "贝叶斯定理标准公式：P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]。这里 H 代表一个命题事件（比如“德国夺冠”），E 代表新出现的新闻事件（比如“队长受伤”），¬H 表示该命题事件不成立（“德国没夺冠”），P(H|E) 就是看到这条新闻事件之后，命题事件成立的概率。",

      "PossMap 的计算公式：Odds = P ÷ (1 − P)；Odds_新 = Odds_旧 × LR；P_新 = Odds_新 ÷ (1 + Odds_新)。这里的似然比 LR 可以用“平行宇宙”来直观理解：设想存在两个平行宇宙——命题成立的宇宙和命题不成立的宇宙，LR 就是“这条新闻在命题成立的宇宙中出现的概率”除以“它在命题不成立的宇宙中出现的概率”。LR 大于1，说明这条新闻在命题成立的世界里更常见，是支持证据；LR 小于1，则说明它在命题不成立的世界里更常见，是反对证据。无论叠加多少条这样的证据，最终概率始终落在 0% 到 100% 之间，越接近事件发生或不发生的临界点，同样强度的新闻所产生的实际影响会自动变小——这正是真实世界中“证据边际效应递减”的体现。",

      "案例说明：命题事件“德国夺冠”当前概率为 60%，对应 Odds = 60 ÷ 40 = 1.5。此时出现一条新闻——“队长受伤”。我们分别站在两个平行宇宙里评估这条新闻出现的概率：在德国最终夺冠的那个平行宇宙里，队长受伤的概率约为 80%；在德国未能夺冠的那个平行宇宙里，队长受伤的概率约为 40%。于是 LR = 80% ÷ 40% = 2，说明这条新闻在“夺冠”的世界里更常见，是支持证据。更新后 Odds = 1.5 × 2 = 3，对应新概率 P = 3 ÷ (1+3) = 75%。如果接下来出现一条强烈反对的证据，LR = 0.3，则 Odds = 3 × 0.3 = 0.9，对应概率回落至约 47.4%。",

      "填写方式：你只需要给新闻打一个目标百分比，比如给“队长受伤”填“−2%”。系统会把这个数字当作目标后验概率 = 60%−2% = 58%（目标 Odds ≈ 1.381）。用目标 Odds ÷ 当前 Odds，就能反推出这条新闻唯一对应的似然比 LR ≈ 0.92——一个方程一个未知数，你无需给出两个平行宇宙概率。系统真正存储和参与计算的是这个 LR，而不是原始的“−2%”；后续新闻按顺序连乘到 Odds 上，概率走势图据此重新计算。",

       "显示精度说明：为了让涨跌概率清晰可读，涨跌概率统一按 0.1% 的精度四舍五入显示。如果一条新闻造成的幅度小于 0.05%（被四舍五入抹平成 0.0%），系统会强制显示为最小单位 ±0.1%，避免出现\"明明有影响却显示没有变化\"的误导；这只影响事件概率、涨跌概率、走势图的显示，后台用于贝叶斯计算的累计事件概率、涨跌概率不受此影响。但当概率已经触及 0% 或 100% 边界、且无法再继续显示变化时（比如已经显示100.0%，又有新闻继续支持），则会显示为 0.0%。"

    ],

    cook_title: "隐私协议",
    cook_steps: [
      "PossMap 无需注册或登录即可使用。我们不会收集你的姓名、邮箱或手机号码等个人身份信息。为了让你能够编辑或删除自己提交的内容，系统会在你的设备本地生成一个随机匿名标识符（存储于浏览器 localStorage 中），该标识符仅用于判断“这是否是你提交的内容”，不会被用于其他用途，也不会与任何真实身份关联。",

      "你在 PossMap 上创建的命题、新闻事件以及对应的论据文本均为公开内容，所有访问者都可以查看。请不要在提交内容中包含他人的隐私信息或敏感数据。",

      "我们使用 Google Firebase 提供数据存储、网站托管与基础访问统计服务，相关数据处理遵循 Firebase 自身的隐私与安全政策。",

      "我们不使用任何用于广告定向或跨网站追踪的 Cookie。",
    ],

    contact_title: "联系我们",
    contact_text: "问题反馈：",
  },
  ja: {

  what_title: "PossMapとは？",
  what_text: "PossMapは、時系列ベイズ推論に基づく動的因果確率マッピングプラットフォームで、ログインなしで命題イベントを作成できます。ユーザーが命題に対してニュースイベントを継続的に追加していくたびに、その命題の確率はベイズロジックに従って再調整されます。",

  logic_title: "ベイズ確率処理ロジック",
  logic_steps: [
    "ベイズの定理の標準公式：P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]。ここでHは命題イベント（例：「ドイツが優勝する」）、Eは新たに発生したニュースイベント（例：「キャプテンが負傷した」）、¬Hはその命題が成立しないこと（「ドイツが優勝しない」）を表し、P(H|E)はこのニュースイベントを踏まえた上で命題が成立する確率です。",

    "PossMapの計算式：Odds = P ÷ (1 − P)；Odds_new = Odds_old × LR；P_new = Odds_new ÷ (1 + Odds_new)。ここでの尤度比（LR）は「パラレルワールド」で直感的に理解できます。命題が成立する世界と、成立しない世界という2つのパラレルワールドが存在すると想像してください。LRとは、「このニュースが命題成立側の世界で発生する確率」を「命題不成立側の世界で発生する確率」で割った値です。LRが1より大きい場合、そのニュースは命題が成立する世界でより頻繁に起こる、つまり支持する証拠であることを意味します。LRが1より小さい場合は、不成立の世界でより頻繁に起こる、つまり反対する証拠であることを意味します。どれだけ多くの証拠を積み重ねても、最終的な確率は常に0%から100%の範囲内に収まります。そして、確率がどちらかの臨界点に近づくほど、同じ強さのニュースが与える実際の影響は自動的に小さくなります。これは現実世界における「証拠の限界効果の減少」を反映したものです。",

    "具体例：命題イベント「ドイツが優勝する」の現在の確率が60%だとすると、Odds = 60 ÷ 40 = 1.5です。ここで「キャプテンが負傷した」というニュースが発生します。2つのパラレルワールドそれぞれの視点からこのニュースが発生する確率を評価すると、ドイツが最終的に優勝する世界では、キャプテンが負傷する確率は約80%、ドイツが優勝しない世界では約40%だとします。すると LR = 80% ÷ 40% = 2 となり、このニュースは「優勝」する世界でより頻繁に発生するため、支持する証拠だと分かります。更新後のOdds = 1.5 × 2 = 3、対応する新しい確率は P = 3 ÷ (1+3) = 75%です。続いて強く反対する証拠（LR = 0.3）が現れた場合、Odds = 3 × 0.3 = 0.9 となり、確率は約47.4%まで戻ります。",

    "入力方法：あなたが行うのは、ニュースに対して目標とするパーセンテージを設定することだけです。例えば「キャプテンが負傷した」に「−2%」と入力します。システムはこの数値を目標事後確率として扱います：60% − 2% = 58%（目標Odds ≈ 1.381）。目標Oddsを現在のOddsで割ることで、このニュースに一意に対応する尤度比（LR ≈ 0.92）を逆算できます——1つの方程式に1つの未知数なので、2つのパラレルワールドの確率をあなたが入力する必要はありません。システムが実際に保存し、計算に使用するのはこのLR値であり、元の「−2%」という数値そのものではありません。以降のニュースイベントは順番にOddsへ掛け合わされ、確率の推移グラフはそれに基づいて再計算されます。",

      "表示精度について：増減率を見やすくするため、0.1%単位で四捨五入して表示しています。あるニュースによる実際の変化幅が0.05%未満で、四捨五入すると0.0%になってしまう場合、システムは方向に応じて最小単位の±0.1%を強制的に表示し、「実際には影響があったのに変化なしと表示される」という誤解を避けます。これはイベント確率・増減率・トレンドグラフの表示のみに影響し、ベイズ計算に使われる実際の確率や変化量には影響しません。ただし、確率がすでに0%または100%の境界に達していて、それ以上表示できる余地がない場合（例：すでに100.0%と表示されている状態で、さらに支持するニュースが追加された場合）は、0.0%と表示されます。"

  ],

  cook_title: "プライバシーポリシー",
  cook_steps: [
    "PossMapは登録やログインなしで利用できます。お名前、メールアドレス、電話番号などの個人を特定できる情報は収集しません。投稿した内容を編集または削除できるようにするため、システムはお使いのデバイス上でランダムな匿名識別子をローカルに生成します（ブラウザのlocalStorageに保存されます）。この識別子は「これがあなたが投稿した内容かどうか」を判別するためだけに使用され、他の用途には使われず、実在の身元と結びつけられることもありません。",

    "PossMap上で作成した命題、ニュースイベント、およびそれに対応する根拠テキストは公開コンテンツであり、すべての訪問者が閲覧できます。投稿内容に他者の個人情報や機密データを含めないようにしてください。",

    "当サービスはデータストレージ、ウェブサイトホスティング、および基本的なアクセス解析サービスとしてGoogle Firebaseを利用しています。関連するデータ処理はFirebase独自のプライバシーおよびセキュリティポリシーに従います。",

    "広告のターゲティングやサイトを越えた追跡を目的としたクッキーは一切使用していません。",
  ],

  contact_title: "お問い合わせ",
  contact_text: "フィードバック：",
},
  de: {

  what_title: "Was ist PossMap?",
  what_text: "PossMap ist eine dynamische, kausale Wahrscheinlichkeits-Mapping-Plattform auf Basis zeitlicher Bayes'scher Inferenz, mit der Nutzer ohne Anmeldung Aussage-Ereignisse erstellen können. Jedes Mal, wenn ein Nutzer ein neues Nachrichtenereignis zu einer Aussage hinzufügt, wird deren Wahrscheinlichkeit gemäß der Bayes'schen Logik neu kalibriert.",

  logic_title: "Bayes'sche Wahrscheinlichkeitslogik",
  logic_steps: [
    "Die Standardformel des Satzes von Bayes: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Dabei steht H für ein Aussage-Ereignis (z. B. „Deutschland wird Weltmeister“), E für ein neu aufgetretenes Nachrichtenereignis (z. B. „der Kapitän verletzt sich“), ¬H bedeutet, dass die Aussage nicht zutrifft („Deutschland wird nicht Weltmeister“), und P(H|E) ist die Wahrscheinlichkeit, dass die Aussage angesichts dieses Nachrichtenereignisses zutrifft.",

    "Die Berechnungsformel von PossMap: Odds = P ÷ (1 − P); Odds_neu = Odds_alt × LR; P_neu = Odds_neu ÷ (1 + Odds_neu). Das Likelihood-Verhältnis (LR) lässt sich anschaulich anhand von „Paralleluniversen“ verstehen: Stellen Sie sich zwei Paralleluniversen vor – eines, in dem die Aussage zutrifft, und eines, in dem sie nicht zutrifft. LR ist die Wahrscheinlichkeit, dass dieses Nachrichtenereignis im Universum eintritt, in dem die Aussage zutrifft, geteilt durch die Wahrscheinlichkeit, dass es im Universum eintritt, in dem die Aussage nicht zutrifft. Ist LR größer als 1, kommt die Nachricht in der Welt, in der die Aussage zutrifft, häufiger vor – sie ist also ein stützender Beleg. Ist LR kleiner als 1, kommt sie in der Welt, in der die Aussage nicht zutrifft, häufiger vor – sie ist also ein widersprechender Beleg. Egal wie viele solcher Belege aneinandergereiht werden, die endgültige Wahrscheinlichkeit bleibt stets zwischen 0 % und 100 %. Und je näher die Wahrscheinlichkeit an einen der beiden Grenzwerte rückt, desto geringer wird automatisch der tatsächliche Einfluss von Nachrichten gleicher Stärke – genau das spiegelt das in der realen Welt zu beobachtende Phänomen des abnehmenden Grenznutzens von Beweisen wider.",

    "Beispiel: Das Aussage-Ereignis „Deutschland wird Weltmeister“ liegt aktuell bei einer Wahrscheinlichkeit von 60 %, was Odds = 60 ÷ 40 = 1,5 entspricht. Nun erscheint eine Nachricht: „Der Kapitän verletzt sich.“ Wir bewerten die Wahrscheinlichkeit dieses Nachrichtenereignisses aus der Perspektive beider Paralleluniversen: In dem Universum, in dem Deutschland letztlich Weltmeister wird, liegt die Wahrscheinlichkeit einer Kapitänsverletzung bei etwa 80 %; in dem Universum, in dem Deutschland nicht Weltmeister wird, liegt sie bei etwa 40 %. Daraus ergibt sich LR = 80 % ÷ 40 % = 2, was bedeutet, dass diese Nachricht in der „Weltmeister“-Welt häufiger vorkommt und somit ein stützender Beleg ist. Die aktualisierten Odds betragen Odds = 1,5 × 2 = 3, was einer neuen Wahrscheinlichkeit von P = 3 ÷ (1+3) = 75 % entspricht. Tritt anschließend ein stark widersprechender Beleg mit LR = 0,3 auf, ergibt sich Odds = 3 × 0,3 = 0,9, was die Wahrscheinlichkeit wieder auf etwa 47,4 % zurückführt.",

    "Eingabe: Sie müssen einer Nachricht lediglich einen Zielprozentsatz zuweisen – zum Beispiel „−2 %“ für „Der Kapitän verletzt sich“. Das System behandelt diese Zahl als Ziel-Posteriorwahrscheinlichkeit = 60 % − 2 % = 58 % (Ziel-Odds ≈ 1,381). Durch Division der Ziel-Odds durch die aktuellen Odds lässt sich das eindeutig zu dieser Nachricht passende Likelihood-Verhältnis (LR ≈ 0,92) zurückrechnen – eine Gleichung mit einer Unbekannten, sodass Sie die beiden Paralleluniversum-Wahrscheinlichkeiten nicht selbst angeben müssen. Was das System tatsächlich speichert und in die Berechnung einbezieht, ist dieser LR-Wert, nicht die ursprüngliche Zahl „−2 %“. Nachfolgende Nachrichtenereignisse werden der Reihe nach mit den Odds multipliziert, und der Wahrscheinlichkeitsverlauf wird entsprechend neu berechnet.",

      "Hinweis zur Anzeigegenauigkeit: Damit die Veränderungsrate übersichtlich bleibt, wird sie auf 0,1% genau gerundet angezeigt. Verursacht eine Nachricht eine tatsächliche Veränderung von weniger als 0,05% (die auf 0,0% abgerundet würde), zeigt das System stattdessen zwangsweise die kleinste Einheit von ±0,1% in der entsprechenden Richtung an, um den irreführenden Eindruck zu vermeiden, es habe \"trotz Auswirkung keine Veränderung\" gegeben. Dies betrifft nur die Anzeige der Ereigniswahrscheinlichkeit, der Veränderungsrate und des Trenddiagramms — die für die bayessche Berechnung verwendete tatsächliche Wahrscheinlichkeit und Veränderung bleiben unberührt. Hat die Wahrscheinlichkeit jedoch bereits die Grenze von 0% oder 100% erreicht und es gibt keinen weiteren Anzeigespielraum (z. B. wird bereits 100,0% angezeigt und eine weitere Nachricht spricht weiterhin dafür), wird 0,0% angezeigt."

  ],

  cook_title: "Datenschutzerklärung",
  cook_steps: [
    "PossMap kann ohne Registrierung oder Anmeldung genutzt werden. Wir erfassen keine personenbezogenen Daten wie Name, E-Mail-Adresse oder Telefonnummer. Damit Sie von Ihnen eingereichte Inhalte bearbeiten oder löschen können, erzeugt das System lokal auf Ihrem Gerät eine zufällige, anonyme Kennung (gespeichert im localStorage Ihres Browsers). Diese Kennung wird ausschließlich dazu verwendet festzustellen, „ob dieser Inhalt von Ihnen stammt“ – sie wird zu keinem anderen Zweck genutzt und niemals mit einer realen Identität verknüpft.",

    "Aussagen, Nachrichtenereignisse und die zugehörigen Begründungstexte, die Sie auf PossMap erstellen, sind öffentliche Inhalte, die für alle Besucher sichtbar sind. Bitte fügen Sie Ihren Beiträgen keine privaten Informationen oder sensiblen Daten anderer Personen hinzu.",

    "Wir nutzen Google Firebase für Datenspeicherung, Website-Hosting und grundlegende Zugriffsstatistiken. Die entsprechende Datenverarbeitung erfolgt gemäß den eigenen Datenschutz- und Sicherheitsrichtlinien von Firebase.",

    "Wir verwenden keine Cookies zur Werbe-Ausrichtung oder zum Tracking über mehrere Websites hinweg.",
  ],

  contact_title: "Kontakt",
  contact_text: "Feedback:",
},
  fr: {

  what_title: "Qu'est-ce que PossMap ?",
  what_text: "PossMap est une plateforme dynamique de cartographie probabiliste causale fondée sur l'inférence bayésienne temporelle, permettant aux utilisateurs de créer des événements-propositions sans inscription. Chaque fois qu'un utilisateur ajoute un nouvel événement d'actualité à une proposition, la probabilité de celle-ci est recalibrée selon la logique bayésienne.",

  logic_title: "Logique de traitement bayésien des probabilités",
  logic_steps: [
    "La formule standard du théorème de Bayes : P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Ici, H représente un événement-proposition (par exemple « l'Allemagne remporte le championnat »), E représente un nouvel événement d'actualité (par exemple « le capitaine se blesse »), ¬H signifie que la proposition ne se vérifie pas (« l'Allemagne ne remporte pas le championnat »), et P(H|E) est la probabilité que la proposition se vérifie compte tenu de cet événement d'actualité.",

    "La formule de calcul de PossMap : Odds = P ÷ (1 − P) ; Odds_nouveau = Odds_ancien × LR ; P_nouveau = Odds_nouveau ÷ (1 + Odds_nouveau). Le rapport de vraisemblance (LR) peut être compris intuitivement à l'aide de la notion d'« univers parallèles » : imaginez deux univers parallèles — celui où la proposition se vérifie et celui où elle ne se vérifie pas. LR correspond à la probabilité que cet événement d'actualité survienne dans l'univers où la proposition se vérifie, divisée par sa probabilité de survenir dans l'univers où elle ne se vérifie pas. Un LR supérieur à 1 signifie que cette actualité est plus fréquente dans le monde où la proposition se vérifie, et constitue donc une preuve favorable ; un LR inférieur à 1 signifie qu'elle est plus fréquente dans le monde où la proposition ne se vérifie pas, et constitue donc une preuve défavorable. Quel que soit le nombre de preuves ainsi accumulées, la probabilité finale reste toujours comprise entre 0 % et 100 % — et plus la probabilité s'approche de l'un de ces seuils critiques, plus l'impact réel d'une actualité de même intensité diminue automatiquement. C'est précisément ce qui traduit, dans le monde réel, le principe des « rendements marginaux décroissants des preuves ».",

    "Exemple concret : l'événement-proposition « l'Allemagne remporte le championnat » affiche actuellement une probabilité de 60 %, soit Odds = 60 ÷ 40 = 1,5. Une actualité survient alors : « le capitaine se blesse ». Nous évaluons la probabilité de cet événement d'actualité depuis chacun des deux univers parallèles : dans l'univers où l'Allemagne remporte finalement le championnat, la probabilité que le capitaine se blesse est d'environ 80 % ; dans l'univers où l'Allemagne ne le remporte pas, elle est d'environ 40 %. On obtient donc LR = 80 % ÷ 40 % = 2, ce qui indique que cette actualité est plus fréquente dans le monde du « titre remporté » et constitue donc une preuve favorable. Les Odds mis à jour sont Odds = 1,5 × 2 = 3, soit une nouvelle probabilité P = 3 ÷ (1+3) = 75 %. Si une preuve fortement défavorable survient ensuite avec LR = 0,3, alors Odds = 3 × 0,3 = 0,9, ramenant la probabilité à environ 47,4 %.",

    "Mode de saisie : il vous suffit d'attribuer un pourcentage cible à une actualité, par exemple en saisissant « −2 % » pour « le capitaine se blesse ». Le système traite ce chiffre comme la probabilité a posteriori cible = 60 % − 2 % = 58 % (Odds cible ≈ 1,381). En divisant l'Odds cible par l'Odds actuel, le système peut déduire le rapport de vraisemblance (LR ≈ 0,92) correspondant de façon unique à cette actualité — une équation, une inconnue, vous n'avez donc jamais besoin de fournir vous-même les deux probabilités issues des univers parallèles. Ce que le système stocke et utilise réellement dans ses calculs, c'est cette valeur de LR, et non le chiffre initial de « −2 % » ; les actualités suivantes sont multipliées successivement aux Odds, et le graphique d'évolution des probabilités est recalculé en conséquence.",

      "Note sur la précision d'affichage : pour que la variation en pourcentage reste claire et lisible, elle est arrondie à 0,1% près. Si une actualité provoque une variation réelle inférieure à 0,05% (qui serait arrondie à 0,0%), le système force l'affichage de l'unité minimale ±0,1% dans le bon sens, afin d'éviter l'impression trompeuse d'une « absence de changement » alors qu'un impact a bien eu lieu. Cela n'affecte que l'affichage de la probabilité de l'événement, de la variation en pourcentage et du graphique de tendance — la probabilité et la variation réelles utilisées dans le calcul bayésien ne sont pas affectées. Toutefois, lorsque la probabilité a déjà atteint la limite de 0% ou 100% et qu'il n'y a plus de marge pour afficher une variation supplémentaire (par exemple, elle affiche déjà 100,0% et une nouvelle actualité continue d'aller dans ce sens), elle s'affichera comme 0,0%."

  ],

  cook_title: "Politique de confidentialité",
  cook_steps: [
    "PossMap peut être utilisé sans inscription ni connexion. Nous ne collectons aucune information personnelle identifiable telle que votre nom, votre adresse e-mail ou votre numéro de téléphone. Afin de vous permettre de modifier ou de supprimer le contenu que vous avez soumis, le système génère localement sur votre appareil un identifiant anonyme aléatoire (stocké dans le localStorage de votre navigateur). Cet identifiant sert uniquement à déterminer « si ce contenu provient bien de vous » — il n'est utilisé à aucune autre fin et n'est jamais associé à une identité réelle.",

    "Les propositions, les événements d'actualité et les textes justificatifs correspondants que vous créez sur PossMap constituent du contenu public, visible par tous les visiteurs. Veuillez ne pas inclure d'informations privées ou de données sensibles concernant des tiers dans vos contributions.",

    "Nous utilisons Google Firebase pour assurer le stockage des données, l'hébergement du site web et des statistiques d'accès de base. Le traitement des données correspondant est régi par les propres politiques de confidentialité et de sécurité de Firebase.",

    "Nous n'utilisons aucun cookie destiné au ciblage publicitaire ou au suivi inter-sites.",
  ],

  contact_title: "Contactez-nous",
  contact_text: "Retour d'expérience :",
},
  es: {

  what_title: "¿Qué es PossMap?",
  what_text: "PossMap es una plataforma de mapeo de probabilidad causal dinámica basada en la inferencia bayesiana de series temporales, donde puedes crear eventos de proposición sin necesidad de iniciar sesión. Al crear eventos y añadir noticias continuamente, cada noticia contribuye a recalibrar la probabilidad del evento según la lógica bayesiana.",

  logic_title: "Lógica de procesamiento de probabilidad bayesiana",
  logic_steps: [
    "Fórmula estándar del teorema de Bayes: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Aquí, H representa una proposición (ej. 'Alemania gana el campeonato'), E representa una noticia nueva (ej. 'El capitán está lesionado'), ¬H representa que la proposición no se cumple ('Alemania no gana'), y P(H|E) es la probabilidad de que la proposición sea cierta tras conocer esa noticia.",

    "Fórmula de cálculo de PossMap: Odds = P ÷ (1 − P); Odds_nuevo = Odds_anterior × LR; P_nuevo = Odds_nuevo ÷ (1 + Odds_nuevo). La razón de verosimilitud (LR) puede entenderse intuitivamente a través de 'universos paralelos': imagina dos universos, uno donde la proposición se cumple y otro donde no. La LR es 'la probabilidad de que esta noticia ocurra en el universo donde se cumple' dividida por 'la probabilidad de que ocurra en el universo donde no se cumple'. Si la LR > 1, la noticia es una evidencia a favor; si la LR < 1, es una evidencia en contra. Independientemente de cuántas evidencias se añadan, la probabilidad siempre se mantendrá entre 0% y 100%, y a medida que se acerque a los extremos, el impacto de una noticia de la misma intensidad disminuirá automáticamente: es el efecto de los rendimientos decrecientes de la evidencia.",

    "Ejemplo práctico: La probabilidad actual de 'Alemania gana' es 60%, lo que corresponde a un Odds = 60 ÷ 40 = 1.5. Aparece la noticia: 'El capitán está lesionado'. Evaluamos la probabilidad en los dos universos: en el universo donde ganan, la probabilidad de que el capitán se lesione es ~80%; en el universo donde no ganan, es ~40%. Por lo tanto, LR = 80% ÷ 40% = 2. Tras la actualización, el nuevo Odds = 1.5 × 2 = 3, lo que equivale a una probabilidad P = 3 ÷ (1+3) = 75%. Si luego aparece una evidencia fuerte en contra con LR = 0.3, el Odds = 3 × 0.3 = 0.9, y la probabilidad cae a ~47.4%.",

    "Cómo completarlo: Solo necesitas asignar un porcentaje objetivo a la noticia, por ejemplo, '-2%' para 'El capitán está lesionado'. El sistema toma este número como la probabilidad posterior objetivo = 60% − 2% = 58% (Odds objetivo ≈ 1.381). Al dividir el Odds objetivo por el Odds actual, se deduce la LR única de la noticia ≈ 0.92. Es una ecuación con una incógnita, por lo que no necesitas calcular las probabilidades de los dos universos paralelos. El sistema almacena y utiliza esta LR para el cálculo; las noticias subsiguientes se multiplican sucesivamente al Odds y el gráfico de tendencia se recalcula en consecuencia.",

      "Nota sobre la precisión de visualización: para que el cambio porcentual sea claro y legible, se muestra redondeado a 0,1%. Si una noticia provoca un cambio real menor a 0,05% (que se redondearía a 0,0%), el sistema lo muestra forzosamente como la unidad mínima de ±0,1% en la dirección correspondiente, evitando la impresión engañosa de que \"no hubo cambio\" cuando en realidad sí lo hubo. Esto solo afecta la visualización de la probabilidad del evento, el cambio porcentual y el gráfico de tendencia — la probabilidad y el cambio reales utilizados en el cálculo bayesiano no se ven afectados. Sin embargo, cuando la probabilidad ya ha alcanzado el límite de 0% o 100% y ya no hay margen para mostrar más cambios (por ejemplo, ya muestra 100,0% y otra noticia sigue respaldándolo), se mostrará como 0,0%."
  ],

  cook_title: "Política de Privacidad",
  cook_steps: [
    "PossMap se puede utilizar sin registro ni inicio de sesión. No recopilamos información de identificación personal como nombres, correos electrónicos o números de teléfono. Para permitirte editar o eliminar tu contenido, el sistema genera un identificador anónimo aleatorio en tu dispositivo (almacenado en localStorage del navegador). Este identificador solo se usa para verificar 'si el contenido te pertenece', no tiene otros fines y no está vinculado a ninguna identidad real.",

    "Las proposiciones, noticias y argumentos que creas en PossMap son públicos y pueden ser vistos por cualquier visitante. Por favor, no incluyas información privada o datos sensibles de terceros en tus envíos.",

    "Utilizamos Google Firebase para el almacenamiento de datos, alojamiento web y estadísticas básicas de acceso. El tratamiento de datos sigue las políticas de privacidad y seguridad propias de Firebase.",

    "No utilizamos ninguna cookie destinada a la segmentación publicitaria o al seguimiento entre sitios.",
  ],

  contact_title: "Contáctanos",
  contact_text: "Comentarios y sugerencias:",
},
  ko: {

    what_title: "PossMap이란 무엇인가요?",
    what_text: "PossMap은 로그인 없이 명제 이벤트를 생성할 수 있는, 시계열 베이지안 추론 기반의 동적 인과 확률 매핑 플랫폼입니다. 사용자가 명제 이벤트를 생성하고 뉴스를 지속적으로 입력하면, 새로운 뉴스가 추가될 때마다 베이지안 확률 논리에 따라 명제 이벤트의 확률이 보정됩니다.",

    logic_title: "베이지안 확률 처리 논리",
    logic_steps: [
      "베이즈 정리 표준 공식: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. 여기서 H는 명제 이벤트(예: '독일 우승'), E는 새로 발생한 뉴스(예: '주장 부상'), ¬H는 명제 이벤트가 성립하지 않는 경우('독일 우승 실패')를 의미하며, P(H|E)는 해당 뉴스를 확인한 후 명제 이벤트가 성립할 확률입니다.",

      "PossMap 계산 공식: Odds = P ÷ (1 − P); Odds_신규 = Odds_기존 × LR; P_신규 = Odds_신규 ÷ (1 + Odds_신규). 여기서 우도비(LR)는 '평행 우주' 개념으로 직관적으로 이해할 수 있습니다. 명제가 성립하는 우주와 성립하지 않는 우주 두 곳을 가정할 때, LR은 '명제가 성립하는 우주에서 해당 뉴스가 발생할 확률'을 '명제가 성립하지 않는 우주에서 해당 뉴스가 발생할 확률'로 나눈 값입니다. LR > 1이면 해당 뉴스는 지지 증거이고, LR < 1이면 반대 증거입니다. 증거가 아무리 쌓여도 최종 확률은 항상 0%에서 100% 사이에 머물며, 사건 발생/미발생의 임계점에 가까워질수록 동일 강도의 뉴스가 미치는 실제 영향력은 자동으로 감소합니다. 이는 실제 현실의 '증거 한계효용 체감'을 반영합니다.",

      "사례 설명: 명제 이벤트 '독일 우승'의 현재 확률이 60%라면, Odds = 60 ÷ 40 = 1.5입니다. 이때 '주장 부상'이라는 뉴스가 발생합니다. 두 평행 우주에서 평가해 보면, 독일이 결국 우승하는 우주에서 주장이 부상당할 확률은 약 80%, 우승하지 못하는 우주에서 부상당할 확률은 약 40%입니다. 따라서 LR = 80% ÷ 40% = 2가 되며, 이는 지지 증거임을 의미합니다. 업데이트 후 Odds = 1.5 × 2 = 3이 되며, 새로운 확률 P = 3 ÷ (1+3) = 75%가 됩니다. 만약 다음에 LR = 0.3인 강력한 반대 증거가 나타나면, Odds = 3 × 0.3 = 0.9가 되어 확률은 약 47.4%로 돌아옵니다.",

      "작성 방법: 뉴스에 목표 백분율만 입력하면 됩니다. 예를 들어 '주장 부상'에 '-2%'를 입력합니다. 시스템은 이 숫자를 목표 사후 확률인 60% − 2% = 58%(목표 Odds ≈ 1.381)로 간주합니다. 목표 Odds를 현재 Odds로 나누면 해당 뉴스에 고유한 LR ≈ 0.92를 역산할 수 있습니다. 방정식 하나에 미지수 하나이므로 두 평행 우주의 확률을 직접 입력할 필요가 없습니다. 시스템은 결과적으로 이 LR을 저장하여 계산에 사용하며, 이후 입력되는 뉴스들은 Odds에 순차적으로 곱해져 확률 추이 그래프를 재계산합니다.",

        "표시 정밀도 안내: 변동률을 명확하게 보여주기 위해 0.1% 단위로 반올림하여 표시합니다. 어떤 뉴스로 인한 실제 변화 폭이 0.05% 미만이라 반올림 시 0.0%가 되어버리는 경우, 시스템은 방향에 맞춰 최소 단위인 ±0.1%를 강제로 표시하여 \"실제로는 영향이 있었는데 변화가 없는 것처럼\" 보이는 오해를 방지합니다. 이는 이벤트 확률, 변동률, 추세 그래프의 표시에만 영향을 미치며, 베이지안 계산에 사용되는 실제 확률과 변동값에는 영향을 주지 않습니다. 다만 확률이 이미 0% 또는 100% 경계에 도달하여 더 이상 표시할 여지가 없는 경우(예: 이미 100.0%로 표시 중인데 추가로 지지하는 뉴스가 들어온 경우)에는 0.0%로 표시됩니다."
    ],

    cook_title: "개인정보 처리방침",
    cook_steps: [
      "PossMap은 회원가입이나 로그인 없이 사용할 수 있습니다. 이름, 이메일, 전화번호와 같은 개인 식별 정보를 수집하지 않습니다. 본인이 제출한 내용을 수정하거나 삭제할 수 있도록, 시스템은 기기 로컬에 무작위 익명 식별자(브라우저 localStorage에 저장)를 생성합니다. 이 식별자는 '제출한 본인 여부'를 확인하는 용도로만 사용되며, 다른 목적으로 사용되거나 실제 신원과 연결되지 않습니다.",

      "PossMap에서 생성한 명제, 뉴스 이벤트 및 대응하는 논거 텍스트는 공개 내용으로 모든 방문자가 볼 수 있습니다. 제출 내용에 타인의 개인정보나 민감한 데이터를 포함하지 마십시오.",

      "데이터 저장, 웹 호스팅 및 기초 접속 통계를 위해 Google Firebase를 사용하며, 관련 데이터 처리는 Firebase의 자체 개인정보 보호 및 보안 정책을 따릅니다.",

      "광고 타겟팅이나 사이트 간 추적을 위한 쿠키는 전혀 사용하지 않습니다.",
    ],

    contact_title: "문의하기",
    contact_text: "문제 피드백:",
  },
  pt: {

what_title: "¿O que é PossMap?",
what_text: "PossMap é uma plataforma de mapeamento de probabilidade causal dinâmica baseada em inferência bayesiana de séries temporais, onde você pode criar eventos de proposição sem necessidade de login. Ao criar proposições e injetar continuamente eventos de notícias, cada nova notícia calibra a probabilidade do evento seguindo a lógica bayesiana.",

logic_title: "Lógica de Processamento de Probabilidade Bayesiana",
logic_steps: [
"Fórmula padrão do teorema de Bayes: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Aqui, H representa um evento de proposição (ex: 'Alemanha vence o campeonato'), E representa a nova notícia (ex: 'Capitão lesionado'), ¬H representa que a proposição não se concretiza ('Alemanha não vence'), e P(H|E) é a probabilidade da proposição ser verdadeira após a notícia.",

"Fórmula de cálculo do PossMap: Odds = P ÷ (1 − P); Odds_novo = Odds_antigo × LR; P_novo = Odds_novo ÷ (1 + Odds_novo). A Razão de Verossimilhança (LR) pode ser compreendida através de 'universos paralelos': imagine dois universos, um onde a proposição ocorre e outro onde não. LR é a 'probabilidade desta notícia aparecer no universo onde a proposição ocorre' dividida pela 'probabilidade de aparecer no universo onde não ocorre'. Se LR > 1, a notícia é uma evidência de apoio; se LR < 1, é uma evidência contrária. Não importa quantas evidências sejam adicionadas, a probabilidade final sempre permanece entre 0% e 100%. À medida que se aproxima dos extremos, o impacto de uma notícia de mesma intensidade diminui automaticamente — é o efeito dos rendimentos marginais decrescentes das evidências.",

"Exemplo prático: A probabilidade atual de 'Alemanha vence' é 60%, logo Odds = 60 ÷ 40 = 1.5. Surge a notícia: 'Capitão lesionado'. Avaliamos nos dois universos: no universo onde vencem, a probabilidade do capitão se lesionar é ~80%; no universo onde não vencem, é ~40%. Logo, LR = 80% ÷ 40% = 2 (evidência de apoio). Novo Odds = 1.5 × 2 = 3, nova probabilidade P = 3 ÷ (1+3) = 75%. Se surgir uma evidência fortemente contrária com LR = 0.3, Odds = 3 × 0.3 = 0.9, e a probabilidade retorna para ~47.4%.",

"Como preencher: Basta atribuir um valor percentual alvo à notícia, por exemplo, '-2%' para 'Capitão lesionado'. O sistema trata isso como probabilidade posterior alvo = 60% − 2% = 58% (Odds alvo ≈ 1.381). Dividindo o Odds alvo pelo Odds atual, deduzimos a LR única da notícia ≈ 0.92. Com uma equação e uma incógnita, você não precisa calcular as probabilidades dos dois universos paralelos. O sistema armazena essa LR para os cálculos; notícias subsequentes são multiplicadas sequencialmente ao Odds, recalculando o gráfico de tendência.",

    "Nota sobre a precisão de exibição: para manter a variação percentual clara e legível, ela é exibida arredondada para 0,1%. Se uma notícia causar uma variação real menor que 0,05% (que seria arredondada para 0,0%), o sistema força a exibição da unidade mínima de ±0,1% na direção correspondente, evitando a impressão enganosa de \"nenhuma mudança\" quando, na verdade, houve impacto. Isso afeta apenas a exibição da probabilidade do evento, da variação percentual e do gráfico de tendência — a probabilidade e a variação reais usadas no cálculo bayesiano não são afetadas. No entanto, quando a probabilidade já atingiu o limite de 0% ou 100% e não há mais espaço para exibir variação adicional (por exemplo, já exibindo 100,0% e outra notícia continua a favor), será exibido como 0,0%."
],

cook_title: "Política de Privacidade",
cook_steps: [
"O PossMap pode ser usado sem registro ou login. Não coletamos nomes, e-mails ou números de telefone. Para permitir que você edite ou exclua o conteúdo que enviou, o sistema gera um identificador anônimo aleatório no seu dispositivo (armazenado no localStorage do navegador). Este identificador serve apenas para verificar 'se o conteúdo é seu', não sendo vinculado a nenhuma identidade real.",

"As proposições, eventos de notícias e argumentos criados no PossMap são públicos e visíveis a todos os visitantes. Por favor, não inclua informações privadas ou dados sensíveis de terceiros.",

"Utilizamos o Google Firebase para armazenamento de dados, hospedagem e estatísticas básicas de acesso, seguindo as políticas de privacidade e segurança do próprio Firebase.",

"Não utilizamos cookies para direcionamento de anúncios ou rastreamento entre sites.",
],

contact_title: "Fale Conosco",
contact_text: "Feedback de problemas:",
},
  ru: {

what_title: "Что такое PossMap?",
what_text: "PossMap — это платформа для динамического отображения причинно-следственных вероятностей на основе байесовского вывода во временных рядах, где можно создавать пропозициональные события без необходимости входа в систему. Пользователи создают события-пропозиции и постоянно добавляют новости; каждое новое событие корректирует вероятность пропозиции в соответствии с логикой Байеса.",

logic_title: "Логика обработки байесовской вероятности",
logic_steps: [
"Стандартная формула теоремы Байеса: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. Здесь H представляет собой пропозициональное событие (например, «Германия победит в чемпионате»), E представляет собой новую новость (например, «Капитан травмирован»), ¬H означает, что пропозиция не выполняется («Германия не победит»), а P(H|E) — это вероятность того, что пропозиция окажется верной после получения этой новости.",


"Формула расчета PossMap: Odds = P ÷ (1 − P); Odds_новый = Odds_старый × LR; P_новый = Odds_новый ÷ (1 + Odds_новый). Коэффициент правдоподобия (LR) можно интуитивно понять через концепцию «параллельных вселенных»: представьте две вселенные — одну, где пропозиция выполняется, и другую, где нет. LR — это «вероятность появления данной новости во вселенной, где пропозиция выполняется», деленная на «вероятность ее появления во вселенной, где она не выполняется». Если LR > 1, новость является подтверждающим доказательством; если LR < 1 — опровергающим. Независимо от того, сколько доказательств добавлено, итоговая вероятность всегда остается в диапазоне от 0% до 100%. По мере приближения к крайним точкам влияния события, воздействие новостей той же интенсивности автоматически уменьшается — это отражение «закона убывающей предельной полезности доказательств» в реальном мире.",

"Пример: Текущая вероятность «Германия победит» составляет 60%, что соответствует Odds = 60 ÷ 40 = 1.5. Появляется новость: «Капитан травмирован». Оцениваем вероятность в двух вселенных: во вселенной, где Германия побеждает, вероятность травмы капитана составляет ~80%; во вселенной, где не побеждает — ~40%. Следовательно, LR = 80% ÷ 40% = 2 (подтверждающее доказательство). После обновления Odds = 1.5 × 2 = 3, что соответствует вероятности P = 3 ÷ (1+3) = 75%. Если затем появляется сильное опровергающее доказательство с LR = 0.3, Odds = 3 × 0.3 = 0.9, и вероятность возвращается к ~47.4%.",

"Как заполнять: Вам нужно лишь указать целевой процент для новости, например, «−2%» для новости «Капитан травмирован». Система воспринимает это число как целевую апостериорную вероятность = 60% − 2% = 58% (целевые Odds ≈ 1.381). Разделив целевые Odds на текущие, можно вычислить единственный коэффициент LR ≈ 0.92 для этой новости. Это уравнение с одним неизвестным, поэтому вам не нужно рассчитывать вероятности для двух параллельных вселенных. Система хранит и использует этот LR для вычислений; последующие новости последовательно умножаются на Odds, и график вероятности пересчитывается соответствующим образом.",

    "Примечание о точности отображения: чтобы изменение вероятности было понятным и читаемым, оно округляется до 0,1%. Если новость вызывает реальное изменение менее 0,05% (которое округлилось бы до 0,0%), система принудительно отображает минимальную единицу ±0,1% в соответствующем направлении, чтобы избежать ложного впечатления «изменений не произошло», хотя влияние на самом деле было. Это влияет только на отображение вероятности события, изменения вероятности и графика тренда — реальная вероятность и изменение, используемые в байесовском расчёте, не затрагиваются. Однако если вероятность уже достигла границы 0% или 100% и больше нет места для отображения дальнейшего изменения (например, уже отображается 100,0%, а очередная новость продолжает её поддерживать), будет отображено значение 0,0%."
],

cook_title: "Политика конфиденциальности",
cook_steps: [
"PossMap можно использовать без регистрации и входа в систему. Мы не собираем личную информацию, такую как имя, адрес электронной почты или номер телефона. Чтобы вы могли редактировать или удалять отправленный контент, система генерирует на вашем устройстве случайный анонимный идентификатор (хранится в localStorage браузера). Этот идентификатор используется только для определения «является ли этот контент вашим», не используется для других целей и не связан с вашей реальной личностью.",


"Созданные вами пропозиции, новости и соответствующие текстовые аргументы на PossMap являются публичными и доступны для просмотра всеми посетителями. Пожалуйста, не включайте в свои материалы частную информацию или конфиденциальные данные третьих лиц.",

"Мы используем Google Firebase для хранения данных, хостинга и базовой статистики посещений; обработка данных соответствует политике конфиденциальности и безопасности Firebase.",

"Мы не используем файлы cookie для таргетированной рекламы или межсайтового отслеживания.",



],

contact_title: "Связаться с нами",
contact_text: "Обратная связь по проблемам:",
},
  ar: {

what_title: "ما هو PossMap؟",
what_text: "PossMap هي منصة لرسم خرائط الاحتمالات السببية الديناميكية القائمة على الاستدلال البايزي للسلاسل الزمنية، حيث يمكنك إنشاء أحداث افتراضية (propositions) دون الحاجة إلى تسجيل الدخول. من خلال إنشاء هذه الأحداث وإضافة الأخبار إليها باستمرار، يقوم كل حدث إخباري جديد بإعادة معايرة احتمالية الحدث بناءً على المنطق البايزي.",

logic_title: "منطق معالجة الاحتمالات البايزية",
logic_steps: [
"معادلة نظرية بايز القياسية: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]. هنا، يمثل H الحدث الافتراضي (مثلاً: 'فوز ألمانيا بالبطولة')، و E يمثل الخبر الجديد (مثلاً: 'إصابة القائد')، و ¬H يمثل عدم تحقق الحدث ('عدم فوز ألمانيا')، و P(H|E) هو احتمالية تحقق الحدث الافتراضي بعد الاطلاع على هذا الخبر.",


"معادلة الحساب في PossMap: Odds = P ÷ (1 − P)؛ Odds_جديد = Odds_قديم × LR؛ P_جديد = Odds_جديد ÷ (1 + Odds_جديد). يمكن فهم نسبة الأرجحية (LR) بحدس من خلال مفهوم 'الأكوان المتوازية': تخيل وجود كونين، أحدهما يتحقق فيه الافتراض والآخر لا يتحقق فيه. LR هي 'احتمالية ظهور هذا الخبر في الكون الذي يتحقق فيه الافتراض' مقسومة على 'احتمالية ظهوره في الكون الذي لا يتحقق فيه'. إذا كانت LR > 1، فالخبر دليل داعم؛ وإذا كانت LR < 1، فالخبر دليل معارض. بغض النظر عن عدد الأدلة المضافة، ستظل الاحتمالية النهائية دائمًا بين 0% و 100%، وكلما اقتربت من نقاط التوازن لحدوث الحدث أو عدمه، سينخفض التأثير الفعلي للأخبار ذات القوة نفسها تلقائيًا — وهذا هو تجسيد لـ 'تناقص المنفعة الحدية للأدلة' في العالم الحقيقي.",

"مثال توضيحي: الاحتمالية الحالية لـ 'فوز ألمانيا' هي 60%، أي Odds = 60 ÷ 40 = 1.5. يظهر خبر: 'إصابة القائد'. نقوم بتقييم احتمال ظهور هذا الخبر في الكونين: في الكون الذي تفوز فيه ألمانيا، احتمال إصابة القائد هو ~80%؛ وفي الكون الذي لا تفوز فيه، الاحتمال ~40%. إذًا LR = 80% ÷ 40% = 2 (دليل داعم). بعد التحديث، يصبح Odds = 1.5 × 2 = 3، مما يعادل احتمالية P = 3 ÷ (1+3) = 75%. إذا ظهر لاحقًا دليل معارض قوي بـ LR = 0.3، يصبح Odds = 3 × 0.3 = 0.9، وتعود الاحتمالية إلى ~47.4%.",

"طريقة التعبئة: ما عليك سوى إعطاء نسبة مئوية مستهدفة للخبر، مثل '-2%' لخبر 'إصابة القائد'. يعتبر النظام هذا الرقم كاحتمالية بعدية مستهدفة = 60% − 2% = 58% (Odds مستهدفة ≈ 1.381). بقسمة الـ Odds المستهدفة على الـ Odds الحالية، يتم استنتاج قيمة LR ≈ 0.92 الخاصة بهذا الخبر. هذه معادلة بمجهول واحد، فلا تحتاج إلى إعطاء احتمالات للكونين المتوازيين. يقوم النظام بتخزين واستخدام قيمة LR هذه في الحسابات؛ وتُضرب الأخبار اللاحقة بالتسلسل في الـ Odds، ويتم إعادة حساب رسم بيان الاتجاه بناءً على ذلك.",

    "ملاحظة حول دقة العرض: للحفاظ على وضوح نسبة التغيّر، يتم عرضها مقرّبة إلى أقرب 0.1%. إذا أدى خبر ما إلى تغيّر فعلي أقل من 0.05% (والذي سيُقرَّب إلى 0.0%)، يقوم النظام بفرض عرض الوحدة الدنيا ±0.1% في الاتجاه الصحيح، تجنبًا للانطباع المُضلِّل بأنه \"لا يوجد تغيير\" رغم وجود تأثير فعلي. يؤثر هذا فقط على عرض احتمالية الحدث، ونسبة التغيّر، والرسم البياني للاتجاه — أما الاحتمالية والتغيّر الفعليان المستخدمان في الحساب البايزي فلا يتأثران. ومع ذلك، عندما تصل الاحتمالية بالفعل إلى حد 0% أو 100% ولا يتبقى مجال لعرض مزيد من التغيير (مثلاً عند عرض 100.0% بالفعل ووجود خبر آخر داعم)، سيتم عرضها كـ 0.0%."

],

cook_title: "سياسة الخصوصية",
cook_steps: [
"يمكن استخدام PossMap دون الحاجة إلى تسجيل أو تسجيل دخول. نحن لا نجمع أي معلومات تعريف شخصية مثل الاسم أو البريد الإلكتروني أو رقم الهاتف. لكي تتمكن من تعديل أو حذف المحتوى الذي قدمته، يقوم النظام بإنشاء معرف مجهول عشوائي على جهازك (يتم تخزينه في localStorage الخاص بالمتصفح). يُستخدم هذا المعرف فقط للتأكد من 'ما إذا كان هذا المحتوى خاصًا بك'، ولا يُستخدم لأي غرض آخر، ولا يرتبط بأي هوية حقيقية.",


"الافتراضات والأحداث الإخبارية والنصوص الاستدلالية التي تنشئها على PossMap هي محتوى عام ويمكن لجميع الزوار مشاهدتها. يرجى عدم تضمين معلومات خاصة أو بيانات حساسة تخص الآخرين في مشاركاتك.",

"نستخدم Google Firebase لتخزين البيانات واستضافة الموقع وإحصائيات الزيارات الأساسية، وتتبع معالجة البيانات سياسات الخصوصية والأمان الخاصة بـ Firebase.",

"نحن لا نستخدم أي ملفات تعريف ارتباط (Cookies) لأغراض الاستهداف الإعلاني أو التتبع عبر المواقع.",



],

contact_title: "اتصل بنا",
contact_text: "للإبلاغ عن مشاكل:",
},
  hi: {

what_title: "PossMap क्या है?",
what_text: "PossMap एक ऐसा डायनेमिक कारण-संभाव्यता मानचित्रण प्लेटफ़ॉर्म है, जो बिना लॉगिन के प्रस्ताव घटनाएँ बनाने की सुविधा देता है और समयक्रमिक बेज़ियन अनुमान पर आधारित है। उपयोगकर्ता एक प्रस्ताव घटना बनाते हैं और लगातार समाचार घटनाएँ जोड़ते रहते हैं, जिससे हर नई खबर के जुड़ने पर प्रस्ताव घटना की संभावना बेज़ियन संभाव्यता तर्क के अनुसार पुनः समायोजित होती है।",

logic_title: "बेज़ियन संभाव्यता प्रसंस्करण तर्क",
logic_steps: [
"बेज़ के प्रमेय का मानक सूत्र: P(H|E) = P(E|H) × P(H) ÷ [P(E|H) × P(H) + P(E|¬H) × P(¬H)]। यहाँ H एक प्रस्ताव घटना को दर्शाता है (जैसे \"जर्मनी चैंपियन बनेगा\"), E एक नई समाचार घटना को (जैसे \"कप्तान घायल हुआ\"), ¬H का अर्थ है कि प्रस्ताव घटना सत्य नहीं होती (\"जर्मनी चैंपियन नहीं बना\"), और P(H|E) इस समाचार को देखने के बाद प्रस्ताव घटना के सत्य होने की संभावना है।",

"PossMap का गणना सूत्र: Odds = P ÷ (1 − P); Odds_नया = Odds_पुराना × LR; P_नया = Odds_नया ÷ (1 + Odds_नया)। यहाँ संभावना अनुपात (LR) को \"समानांतर ब्रह्मांड\" के रूप में सहज ढंग से समझा जा सकता है। दो समानांतर ब्रह्मांडों की कल्पना करें — एक जिसमें प्रस्ताव सत्य होता है और एक जिसमें नहीं — LR वह मान है जो \"प्रस्ताव के सत्य होने वाले ब्रह्मांड में उस समाचार के घटित होने की संभावना\" को \"प्रस्ताव के असत्य होने वाले ब्रह्मांड में उसकी संभावना\" से विभाजित करके मिलता है। यदि LR > 1 है तो वह समाचार समर्थक प्रमाण है, और यदि LR < 1 है तो वह विरोधी प्रमाण है। चाहे कितने भी प्रमाण जुड़ें, अंतिम संभावना हमेशा 0% से 100% के बीच ही रहती है, और जैसे-जैसे घटना के घटित होने या न होने की सीमा नज़दीक आती है, समान तीव्रता की खबर का वास्तविक प्रभाव अपने आप कम होता जाता है। यह वास्तविक दुनिया में \"प्रमाण के घटते सीमांत प्रभाव\" को दर्शाता है।\"",

"उदाहरण: प्रस्ताव घटना \"जर्मनी चैंपियन बनेगा\" की वर्तमान संभावना 60% है, जिसके अनुसार Odds = 60 ÷ 40 = 1.5। अब \"कप्तान घायल हुआ\" नामक एक समाचार आता है। दोनों समानांतर ब्रह्मांडों में इसका आकलन करें: जिस ब्रह्मांड में जर्मनी चैंपियन बनता है, उसमें कप्तान के घायल होने की संभावना लगभग 80% है; जिस ब्रह्मांड में जर्मनी चैंपियन नहीं बनता, उसमें यह संभावना लगभग 40% है। इसलिए LR = 80% ÷ 40% = 2, जो दर्शाता है कि यह समर्थक प्रमाण है। अद्यतन Odds = 1.5 × 2 = 3, जिसके अनुसार नई संभावना P = 3 ÷ (1+3) = 75% होती है। यदि इसके बाद LR = 0.3 जैसा कोई मज़बूत विरोधी प्रमाण आता है, तो Odds = 3 × 0.3 = 0.9, और संभावना लगभग 47.4% पर वापस आ जाती है।",

"भरने का तरीका: आपको बस समाचार के लिए एक लक्ष्य प्रतिशत दर्ज करना है (जैसे \"कप्तान घायल हुआ\" के लिए \"−2%\")। सिस्टम इस संख्या को लक्ष्य पश्च संभावना के रूप में लेता है: 60% − 2% = 58% (लक्ष्य Odds ≈ 1.381)। लक्ष्य Odds को वर्तमान Odds से विभाजित करके, उस समाचार का विशिष्ट LR ≈ 0.92 निकाला जाता है। चूँकि यह एक अज्ञात वाला समीकरण है, इसलिए आपको दो समानांतर ब्रह्मांडों की संभावनाएँ अलग से भरने की ज़रूरत नहीं है। सिस्टम इस LR को संग्रहीत करता है और गणना में उपयोग करता है; आगे की हर खबर क्रमशः Odds से गुणा होती जाती है, और संभावना का ट्रेंड ग्राफ़ इसी आधार पर पुनः गणना किया जाता है।",

"प्रदर्शन सटीकता संबंधी नोट: बदलाव के प्रतिशत को स्पष्ट और पढ़ने योग्य बनाए रखने के लिए, इसे 0.1% की सटीकता तक राउंड करके दिखाया जाता है। यदि किसी समाचार से वास्तविक बदलाव 0.05% से कम होता है (जो राउंड होकर 0.0% बन जाएगा), तो सिस्टम सही दिशा में न्यूनतम इकाई ±0.1% दिखाने के लिए बाध्य करता है, ताकि \"असर होने के बावजूद कोई बदलाव नहीं दिखना\" जैसी भ्रामक स्थिति से बचा जा सके। यह केवल घटना की संभावना, बदलाव के प्रतिशत और ट्रेंड चार्ट के प्रदर्शन को प्रभावित करता है — बेज़ियन गणना में उपयोग होने वाली वास्तविक संभावना और बदलाव प्रभावित नहीं होते। हालाँकि, जब संभावना पहले से ही 0% या 100% की सीमा तक पहुँच चुकी हो और आगे बदलाव दिखाने की कोई गुंजाइश न बचे (जैसे पहले से ही 100.0% दिख रहा हो और कोई और समाचार उसी दिशा में समर्थन करता रहे), तो यह 0.0% के रूप में दिखाया जाएगा।"

],

cook_title: "गोपनीयता नीति",
cook_steps: [
"PossMap का उपयोग पंजीकरण या लॉगिन के बिना किया जा सकता है। हम आपका नाम, ईमेल पता या फ़ोन नंबर जैसी कोई व्यक्तिगत पहचान जानकारी एकत्र नहीं करते। आप अपनी पोस्ट की गई सामग्री को संपादित या हटा सकें, इसके लिए सिस्टम आपके डिवाइस पर स्थानीय रूप से एक यादृच्छिक गुमनाम पहचानकर्ता बनाता है (जो ब्राउज़र के localStorage में संग्रहीत होता है)। इस पहचानकर्ता का उपयोग केवल यह जांचने के लिए किया जाता है कि \"क्या यह सामग्री आपके द्वारा पोस्ट की गई है\", और इसे किसी अन्य उद्देश्य या वास्तविक पहचान से नहीं जोड़ा जाता।",

"PossMap पर बनाए गए प्रस्ताव, समाचार घटनाएँ और संबंधित तर्क पाठ सार्वजनिक सामग्री हैं, जिन्हें सभी आगंतुक देख सकते हैं। कृपया अपनी पोस्ट की गई सामग्री में किसी और की निजी जानकारी या संवेदनशील डेटा शामिल न करें।",

"हम डेटा भंडारण, वेब होस्टिंग और बुनियादी एक्सेस आँकड़ों के लिए Google Firebase का उपयोग करते हैं, और संबंधित डेटा प्रोसेसिंग Firebase की अपनी गोपनीयता एवं सुरक्षा नीतियों का पालन करती है।",

"हम विज्ञापन लक्ष्यीकरण या क्रॉस-साइट ट्रैकिंग के लिए किसी भी प्रकार की कुकी का उपयोग नहीं करते।",

],

contact_title: "संपर्क करें",
contact_text: "समस्या प्रतिक्रिया:",
},
};

export default function About() {
  const lang = localStorage.getItem("language") || "en";
  const t = aboutTranslations[lang] || aboutTranslations["en"];
  const isRTL = lang === "ar";
  const directionStyle = isRTL ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div className="about">
      <div className="about-wapper">

        {t.what_title && (
          <>
            <div className="about-title">{t.what_title}</div>
            <div className="about-text" style={directionStyle}>{t.what_text}</div>
          </>
        )}

        {t.logic_title && (
            <>
              <div className="about-title" >{t.logic_title}</div >
              <div className="about-text" style={directionStyle} >
                {t.logic_steps.map((step, i) => (
                    <div key={i} className="about-paragraph" >
                      <p >{step}</p >
                    </div >
                ))}
              </div >
            </>
        )}

        {t.cook_title && (
            <>
              <div className="about-title" >{t.cook_title}</div >
              <div className="about-text" style={directionStyle} >
                {t.cook_steps.map((step, i) => (
                    <div key={i} className="about-paragraph" >
                      <p >{step}</p >
                    </div >
                ))}
              </div >
            </>
        )}


        {t.contact_title && (
          <>
            <div className="about-title">{t.contact_title}</div>
            <div className="about-text" style={directionStyle}>
              {t.contact_text}{" "}
              <a className="about-green" href="mailto:BroderickJohnson2048@gmail.com">BroderickJohnson2048@gmail.com</a>
            </div>
          </>
        )}

        <div className="about-bottom" />
        <div className="about-text">© 2026 PossMap | Possibilities Mapping</div>

      </div>
    </div>
  );
}