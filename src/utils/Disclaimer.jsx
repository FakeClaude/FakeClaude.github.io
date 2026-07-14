// utils/Disclaimer.jsx
import { h } from "preact";
import "./about.css";

const disclaimerTranslations = {
  en: {
    tagline: "Please Read Before Contributing",
    s1_title: "Community-Generated Content",
    s1_text: "All probability estimates, causal chains, and trigger events on PossMap are submitted by community members. PossMap does not verify, endorse, or guarantee the accuracy, completeness, or timeliness of any content on this platform.",
    s2_title: "Not Financial or Legal Advice",
    s2_text: "Nothing on PossMap constitutes financial, investment, legal, medical, or any other form of professional advice. Probability figures are speculative community estimates only. Do not make financial or legal decisions based on content found here.",
    s3_title: "Your Responsibility as a Contributor",
    s3_steps: [
      "You confirm that any news source you submit is real, publicly accessible, and accurately described.",
      "You confirm that your probability adjustment and basis text represent your honest reasoning, not manipulation.",
      "You accept sole responsibility for the content you submit.",
      "You will not submit content that is false, misleading, defamatory, or intended to manipulate outcomes.",
    ],
    s4_title: "No Liability",
    s4_text: "PossMap and its operators accept no liability for decisions made in reliance on content published here. Use of this platform is entirely at your own risk.",
    s5_title: "Content Removal",
    s5_text: "PossMap reserves the right to remove any content that violates these terms or that is deemed harmful, misleading, or inappropriate, without prior notice.",
    contact_title: "Questions",
    contact_text: "For questions about these terms:",
  },
  zh: {
    tagline: "投稿前请仔细阅读",
    s1_title: "社区生成内容",
    s1_text: "PossMap 上的所有概率估算、因果链及触发事件均由社区成员提交。PossMap 不对平台上任何内容的准确性、完整性或时效性进行核实、背书或保证。",
    s2_title: "非金融或法律建议",
    s2_text: "PossMap 上的任何内容均不构成金融、投资、法律、医疗或任何其他形式的专业建议。概率数字仅为社区投机性估算，请勿据此作出财务或法律决策。",
    s3_title: "作为投稿者的责任",
    s3_steps: [
      "您确认所提交的新闻来源真实、可公开访问且描述准确。",
      "您确认您的概率调整和依据文本代表您诚实的推理，而非操纵行为。",
      "您独自承担所提交内容的全部责任。",
      "您不得提交虚假、误导性、诽谤性或意图操纵结果的内容。",
    ],
    s4_title: "免责声明",
    s4_text: "PossMap 及其运营方对基于本平台内容所作决策产生的任何损失概不负责。使用本平台的风险由用户自行承担。",
    s5_title: "内容移除",
    s5_text: "PossMap 保留无需事先通知即删除任何违反本条款或被认定有害、误导性或不当内容的权利。",
    contact_title: "联系我们",
    contact_text: "如对上述条款有疑问：",
  },
  ja: {
    tagline: "投稿前にお読みください",
    s1_title: "コミュニティ生成コンテンツ",
    s1_text: "PossMap上のすべての確率推定、因果連鎖、トリガーイベントはコミュニティメンバーによって投稿されたものです。PossMapはプラットフォーム上のいかなるコンテンツの正確性、完全性、または適時性も検証、保証しません。",
    s2_title: "金融・法律上のアドバイスではありません",
    s2_text: "PossMap上のいかなる内容も、金融、投資、法律、医療その他の専門的アドバイスを構成するものではありません。確率の数値は投機的なコミュニティ推定にすぎません。",
    s3_title: "投稿者としての責任",
    s3_steps: [
      "投稿するニュースソースが実在し、公開アクセス可能で、正確に説明されていることを確認してください。",
      "確率調整と根拠テキストが誠実な推論を表していることを確認してください。",
      "投稿するコンテンツに対する責任は投稿者のみが負います。",
      "虚偽、誤解を招く、中傷的、または結果を操作する意図のあるコンテンツは投稿しないでください。",
    ],
    s4_title: "免責事項",
    s4_text: "PossMapおよびその運営者は、本プラットフォームで公開されたコンテンツへの依存に基づいて行われた決定について一切の責任を負いません。",
    s5_title: "コンテンツの削除",
    s5_text: "PossMapは、本規約に違反する、または有害・誤解を招く・不適切と判断されたコンテンツを事前通知なく削除する権利を留保します。",
    contact_title: "お問い合わせ",
    contact_text: "これらの規約に関するご質問：",
  },
  de: {
    tagline: "Bitte vor dem Beitragen lesen",
    s1_title: "Von der Community erstellte Inhalte",
    s1_text: "Alle Wahrscheinlichkeitsschätzungen, Kausalketten und Auslöserereignisse auf PossMap werden von Community-Mitgliedern eingereicht. PossMap überprüft, befürwortet oder garantiert nicht die Richtigkeit, Vollständigkeit oder Aktualität von Inhalten.",
    s2_title: "Keine Finanz- oder Rechtsberatung",
    s2_text: "Nichts auf PossMap stellt eine Finanz-, Investitions-, Rechts-, Medizin- oder sonstige professionelle Beratung dar. Wahrscheinlichkeitszahlen sind nur spekulative Community-Schätzungen.",
    s3_title: "Ihre Verantwortung als Beitragender",
    s3_steps: [
      "Sie bestätigen, dass jede von Ihnen eingereichte Nachrichtenquelle real und öffentlich zugänglich ist.",
      "Sie bestätigen, dass Ihre Wahrscheinlichkeitsanpassung Ihr ehrliches Urteil widerspiegelt.",
      "Sie übernehmen die alleinige Verantwortung für die von Ihnen eingereichten Inhalte.",
      "Sie werden keine falschen, irreführenden oder diffamierenden Inhalte einreichen.",
    ],
    s4_title: "Haftungsausschluss",
    s4_text: "PossMap und seine Betreiber übernehmen keine Haftung für Entscheidungen, die auf der Grundlage hier veröffentlichter Inhalte getroffen werden.",
    s5_title: "Entfernung von Inhalten",
    s5_text: "PossMap behält sich das Recht vor, Inhalte, die gegen diese Bedingungen verstoßen, ohne vorherige Ankündigung zu entfernen.",
    contact_title: "Kontakt",
    contact_text: "Fragen zu diesen Bedingungen:",
  },
  fr: {
    tagline: "Veuillez lire avant de contribuer",
    s1_title: "Contenu généré par la communauté",
    s1_text: "Toutes les estimations de probabilité, chaînes causales et événements déclencheurs sur PossMap sont soumis par des membres de la communauté. PossMap ne vérifie ni ne garantit l'exactitude, l'exhaustivité ou l'actualité de tout contenu.",
    s2_title: "Pas un conseil financier ou juridique",
    s2_text: "Rien sur PossMap ne constitue un conseil financier, d'investissement, juridique, médical ou autre conseil professionnel. Les chiffres de probabilité ne sont que des estimations spéculatives de la communauté.",
    s3_title: "Votre responsabilité en tant que contributeur",
    s3_steps: [
      "Vous confirmez que toute source d'actualité soumise est réelle et accessible au public.",
      "Vous confirmez que votre ajustement de probabilité représente votre raisonnement honnête.",
      "Vous acceptez l'entière responsabilité du contenu que vous soumettez.",
      "Vous ne soumettrez pas de contenu faux, trompeur ou diffamatoire.",
    ],
    s4_title: "Absence de responsabilité",
    s4_text: "PossMap et ses opérateurs n'acceptent aucune responsabilité pour les décisions prises en s'appuyant sur le contenu publié ici.",
    s5_title: "Suppression de contenu",
    s5_text: "PossMap se réserve le droit de supprimer tout contenu qui viole ces conditions, sans préavis.",
    contact_title: "Contact",
    contact_text: "Questions concernant ces conditions :",
  },
  es: {
    tagline: "Lea antes de contribuir",
    s1_title: "Contenido generado por la comunidad",
    s1_text: "Todas las estimaciones de probabilidad en PossMap son enviadas por miembros de la comunidad. PossMap no verifica ni garantiza la exactitud de ningún contenido.",
    s2_title: "No es asesoramiento financiero o legal",
    s2_text: "Nada en PossMap constituye asesoramiento financiero, de inversión, legal o médico. Las cifras de probabilidad son solo estimaciones especulativas.",
    s3_title: "Su responsabilidad como colaborador",
    s3_steps: [
      "Confirma que cualquier fuente de noticias enviada es real y accesible públicamente.",
      "Confirma que su ajuste de probabilidad representa su razonamiento honesto.",
      "Acepta la responsabilidad exclusiva del contenido que envía.",
      "No enviará contenido falso, engañoso o difamatorio.",
    ],
    s4_title: "Sin responsabilidad",
    s4_text: "PossMap y sus operadores no aceptan ninguna responsabilidad por las decisiones tomadas en base al contenido publicado aquí.",
    s5_title: "Eliminación de contenido",
    s5_text: "PossMap se reserva el derecho de eliminar cualquier contenido que viole estos términos, sin previo aviso.",
    contact_title: "Contacto",
    contact_text: "Preguntas sobre estos términos:",
  },
  ko: {
    tagline: "기여하기 전에 읽어주세요",
    s1_title: "커뮤니티 생성 콘텐츠",
    s1_text: "PossMap의 모든 확률 추정치, 인과 사슬 및 트리거 이벤트는 커뮤니티 구성원이 제출한 것입니다. PossMap은 플랫폼의 어떤 콘텐츠의 정확성, 완전성 또는 적시성도 검증하거나 보장하지 않습니다.",
    s2_title: "금융 또는 법률 조언이 아닙니다",
    s2_text: "PossMap의 어떤 내용도 금융, 투자, 법률, 의료 또는 기타 전문적 조언을 구성하지 않습니다. 확률 수치는 투기적 커뮤니티 추정치일 뿐입니다.",
    s3_title: "기여자로서의 책임",
    s3_steps: [
      "제출하는 뉴스 출처가 실제이고 공개적으로 접근 가능하며 정확하게 설명되었음을 확인합니다.",
      "확률 조정과 근거 텍스트가 솔직한 추론을 나타냄을 확인합니다.",
      "제출하는 콘텐츠에 대한 단독 책임을 수락합니다.",
      "허위, 오해의 소지가 있거나 명예훼손적인 콘텐츠를 제출하지 않습니다.",
    ],
    s4_title: "면책 조항",
    s4_text: "PossMap 및 그 운영자는 여기에 게시된 콘텐츠에 의존하여 내린 결정에 대해 어떠한 책임도 지지 않습니다.",
    s5_title: "콘텐츠 삭제",
    s5_text: "PossMap은 이 약관을 위반하거나 유해하거나 오해의 소지가 있다고 판단되는 콘텐츠를 사전 통지 없이 삭제할 권리를 보유합니다.",
    contact_title: "문의",
    contact_text: "이 약관에 관한 질문:",
  },
  pt: {
    tagline: "Leia antes de contribuir",
    s1_title: "Conteúdo gerado pela comunidade",
    s1_text: "Todas as estimativas de probabilidade no PossMap são enviadas por membros da comunidade. O PossMap não verifica nem garante a precisão de qualquer conteúdo.",
    s2_title: "Não é conselho financeiro ou jurídico",
    s2_text: "Nada no PossMap constitui aconselhamento financeiro, de investimento, jurídico ou médico. Os números de probabilidade são apenas estimativas especulativas.",
    s3_title: "Sua responsabilidade como colaborador",
    s3_steps: [
      "Confirma que qualquer fonte de notícias enviada é real e acessível publicamente.",
      "Confirma que seu ajuste de probabilidade representa seu raciocínio honesto.",
      "Aceita responsabilidade exclusiva pelo conteúdo que envia.",
      "Não enviará conteúdo falso, enganoso ou difamatório.",
    ],
    s4_title: "Sem responsabilidade",
    s4_text: "PossMap e seus operadores não aceitam nenhuma responsabilidade por decisões tomadas com base no conteúdo publicado aqui.",
    s5_title: "Remoção de conteúdo",
    s5_text: "PossMap reserva-se o direito de remover qualquer conteúdo que viole estes termos, sem aviso prévio.",
    contact_title: "Contato",
    contact_text: "Perguntas sobre estes termos:",
  },
  ru: {
    tagline: "Пожалуйста, прочитайте перед публикацией",
    s1_title: "Контент, созданный сообществом",
    s1_text: "Все оценки вероятности на PossMap публикуются членами сообщества. PossMap не проверяет и не гарантирует точность, полноту или актуальность любого контента.",
    s2_title: "Не является финансовой или юридической консультацией",
    s2_text: "Ничто на PossMap не является финансовым, инвестиционным, юридическим, медицинским или иным профессиональным советом. Цифры вероятности — это лишь спекулятивные оценки сообщества.",
    s3_title: "Ваша ответственность как участника",
    s3_steps: [
      "Вы подтверждаете, что любой источник новостей реален и общедоступен.",
      "Вы подтверждаете, что ваша корректировка вероятности отражает честные рассуждения.",
      "Вы принимаете полную ответственность за публикуемый контент.",
      "Вы не будете публиковать ложный, вводящий в заблуждение или клеветнический контент.",
    ],
    s4_title: "Отказ от ответственности",
    s4_text: "PossMap и его операторы не несут ответственности за решения, принятые на основе контента, опубликованного здесь.",
    s5_title: "Удаление контента",
    s5_text: "PossMap оставляет за собой право удалить любой контент, нарушающий настоящие условия, без предварительного уведомления.",
    contact_title: "Контакты",
    contact_text: "Вопросы по этим условиям:",
  },
  ar: {
    tagline: "يرجى القراءة قبل المساهمة",
    s1_title: "محتوى من إنشاء المجتمع",
    s1_text: "جميع تقديرات الاحتمالية وسلاسل الأسباب وأحداث التحفيز على PossMap مُقدَّمة من أعضاء المجتمع. لا تتحقق PossMap من دقة أي محتوى أو تضمنه أو تضمن اكتماله.",
    s2_title: "ليس نصيحة مالية أو قانونية",
    s2_text: "لا يُشكّل أي محتوى على PossMap نصيحة مالية أو استثمارية أو قانونية أو طبية أو أي نصيحة مهنية أخرى. أرقام الاحتمالية مجرد تقديرات تخمينية من المجتمع.",
    s3_title: "مسؤوليتك كمساهم",
    s3_steps: [
      "تؤكد أن أي مصدر إخباري تقدمه حقيقي ومتاح للعموم وموصوف بدقة.",
      "تؤكد أن تعديل احتماليتك يمثل استدلالك الصادق.",
      "تقبل المسؤولية الكاملة عن المحتوى الذي تقدمه.",
      "لن تقدم محتوى كاذبًا أو مضللًا أو تشهيريًا.",
    ],
    s4_title: "إخلاء المسؤولية",
    s4_text: "لا تتحمل PossMap ومشغلوها أي مسؤولية عن القرارات المتخذة اعتمادًا على المحتوى المنشور هنا.",
    s5_title: "إزالة المحتوى",
    s5_text: "تحتفظ PossMap بالحق في إزالة أي محتوى ينتهك هذه الشروط دون إشعار مسبق.",
    contact_title: "تواصل",
    contact_text: "أسئلة حول هذه الشروط:",
  },
  hi: {
    tagline: "योगदान से पहले पढ़ें",
    s1_title: "समुदाय द्वारा निर्मित सामग्री",
    s1_text: "PossMap पर सभी संभाव्यता अनुमान समुदाय के सदस्यों द्वारा प्रस्तुत किए जाते हैं। PossMap किसी भी सामग्री की सटीकता, पूर्णता या समयबद्धता को सत्यापित या गारंटी नहीं करता।",
    s2_title: "वित्तीय या कानूनी सलाह नहीं",
    s2_text: "PossMap पर कुछ भी वित्तीय, निवेश, कानूनी, चिकित्सा या किसी अन्य पेशेवर सलाह का गठन नहीं करता। संभाव्यता आंकड़े केवल सट्टा सामुदायिक अनुमान हैं।",
    s3_title: "योगदानकर्ता के रूप में आपकी जिम्मेदारी",
    s3_steps: [
      "आप पुष्टि करते हैं कि आपके द्वारा प्रस्तुत समाचार स्रोत वास्तविक और सार्वजनिक रूप से सुलभ है।",
      "आप पुष्टि करते हैं कि आपका संभाव्यता समायोजन आपके ईमानदार तर्क को दर्शाता है।",
      "आप प्रस्तुत सामग्री की पूर्ण जिम्मेदारी स्वीकार करते हैं।",
      "आप झूठी, भ्रामक या मानहानिकारक सामग्री प्रस्तुत नहीं करेंगे।",
    ],
    s4_title: "कोई दायित्व नहीं",
    s4_text: "PossMap और उसके संचालक यहाँ प्रकाशित सामग्री पर निर्भर निर्णयों के लिए कोई दायित्व स्वीकार नहीं करते।",
    s5_title: "सामग्री हटाना",
    s5_text: "PossMap इन शर्तों का उल्लंघन करने वाली किसी भी सामग्री को बिना पूर्व सूचना के हटाने का अधिकार सुरक्षित रखता है।",
    contact_title: "संपर्क",
    contact_text: "इन शर्तों के बारे में प्रश्न:",
  },
};

export default function Disclaimer() {
  const lang = localStorage.getItem("language") || "en";
  const t = disclaimerTranslations[lang] || disclaimerTranslations["en"];
  const isRTL = lang === "ar";
  const directionStyle = isRTL ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div className="about">
      <div className="about-wapper">

        <div className="about-tagline">{t.tagline}</div>

        <div className="about-title">{t.s1_title}</div>
        <div className="about-text" style={directionStyle}>{t.s1_text}</div>

        <div className="about-title">{t.s2_title}</div>
        <div className="about-text" style={directionStyle}>{t.s2_text}</div>

        <div className="about-title">{t.s3_title}</div>
        <div className="about-text" style={directionStyle}>
          <ol className="about-ol">
            {t.s3_steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>

        <div className="about-title">{t.s4_title}</div>
        <div className="about-text" style={directionStyle}>{t.s4_text}</div>

        <div className="about-title">{t.s5_title}</div>
        <div className="about-text" style={directionStyle}>{t.s5_text}</div>

        <div className="about-title">{t.contact_title}</div>
        <div className="about-text" style={directionStyle}>
          {t.contact_text}{" "}
          <a className="about-green" href="mailto:BroderickJohnson2048@gmail.com">BroderickJohnson2048@gmail.com</a>
        </div>

        <div className="about-bottom" />
        <div className="about-text">© 2026 PossMap | Possibilities Mapping</div>

      </div>
    </div>
  );
}