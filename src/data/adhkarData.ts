import type { LanguageCode } from '../types';

export type AdhkarCategoryId = 'morning' | 'evening' | 'afterPrayer' | 'sleep' | 'quranicDuas';

export interface DhikrItem {
  id: string;
  category: AdhkarCategoryId;
  arabic: string;
  count: number;
  source: string;
  translations: Record<Exclude<LanguageCode, 'ar'>, string>;
}

export const ADHKAR_ITEMS: DhikrItem[] = [
  {
    id: 'm1',
    category: 'morning',
    arabic:
      'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ.',
    count: 1,
    source: 'صحيح مسلم',
    translations: {
      en: 'We have reached the morning and at this very time all sovereignty belongs to Allah, and all praise is for Allah. None has the right to be worshipped except Allah alone, without partner; to Him belongs all sovereignty and praise and He is over all things omnipotent.',
      fr: 'Nous voici au matin et la royauté appartient à Allah. Louange à Allah, il n’y a de divinité que Lui, Seul, sans associé. À Lui la royauté et la louange et Il est Omnipotent.',
      tr: 'Sabaha erdik, mülk de Allah’ın olarak sabahladı. Allah’a hamdolsun. Allah’tan başka ilah yoktur; O tektir, ortağı yoktur. Mülk ve hamd O’nundur ve O her şeye kadirdir.',
      ur: 'ہم نے صبح کی اور تمام بادشاہت اللہ ہی کی ہے۔ تمام تعریفیں اللہ کے لیے ہیں، اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں۔',
      id: 'Kami telah memasuki waktu pagi dan kerajaan hanya milik Allah, segala puji bagi Allah. Tidak ada Tuhan selain Allah Yang Maha Esa, tiada sekutu bagi-Nya.',
      es: 'Hemos amanecido y el reino pertenece a Dios. Alabado sea Dios, no hay divinidad sino Él, Único, sin asociados; Suyo es el reino y Suya la alabanza.',
    },
  },
  {
    id: 'm2',
    category: 'morning',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',
    count: 1,
    source: 'صحيح البخاري — سيد الاستغفار',
    translations: {
      en: 'O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me and I acknowledge my sin, so forgive me, for verily none can forgive sins except You.',
      fr: 'Ô Allah, Tu es mon Seigneur, nul n’est en droit d’être adoré si ce n’est Toi. Tu m’as créé et je suis Ton serviteur. Je reconnais Tes bienfaits envers moi et je reconnais mes péchés ; pardonne-moi car nul autre que Toi ne pardonne les péchés.',
      tr: 'Allah’ım! Sen benim Rabbimsin, Senden başka ilah yoktur. Beni Sen yarattın ve ben Senin kulunum. Gücüm yettiğince Senin ahdin ve vaadin üzereyim. Günahlarımı bağışla, çünkü günahları ancak Sen bağışlarsın.',
      ur: 'اے اللہ! تو میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں۔ میں تیرے عہد اور وعدے پر قائم ہوں۔ مجھے بخش دے کیونکہ تیرے سوا کوئی گناہ معاف نہیں کر سکتا۔',
      id: 'Ya Allah, Engkau adalah Rabbku, tiada Tuhan selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu. Aku mengakui nikmat-Mu dan dosaku, maka ampunilah aku.',
      es: 'Oh Dios, Tú eres mi Señor, no hay más divinidad que Tú. Me creaste y soy Tu siervo. Reconozco Tus bendiciones sobre mí y reconozco mis pecados; perdóname, pues nadie perdona los pecados sino Tú.',
    },
  },
  {
    id: 'm3',
    category: 'morning',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.',
    count: 3,
    source: 'سنن أبي داود والترمذي',
    translations: {
      en: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, All-Knowing.',
      fr: 'Au nom d’Allah, avec le nom duquel rien sur terre ni au ciel ne peut nuire, et Il est l’Audient, l’Omniscient.',
      tr: 'İsmiyle yerde ve gökte hiçbir şeyin zarar veremediği Allah’ın adıyla. O, işitendir, bilendir.',
      ur: 'اللہ کے نام کے ساتھ جس کے نام کی برکت سے زمین و آسمان کی کوئی چیز نقصان نہیں پہنچا سکتی، اور وہ خوب سننے والا، جاننے والا ہے۔',
      id: 'Dengan nama Allah yang bersama nama-Nya tidak ada sesuatu pun di bumi dan di langit yang dapat membahayakan, dan Dia Maha Mendengar lagi Maha Mengetahui.',
      es: 'En el nombre de Dios, con cuyo nombre nada en la tierra ni en el cielo puede hacer daño, y Él es Quien todo lo oye, Quien todo lo sabe.',
    },
  },
  {
    id: 'm4',
    category: 'morning',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.',
    count: 7,
    source: 'سورة التوبة ١٢٩',
    translations: {
      en: 'Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.',
      fr: 'Allah me suffit : il n’y a point de divinité à part Lui. En Lui je place ma confiance, et Il est le Seigneur du Trône immense.',
      tr: 'Allah bana yeter, O’ndan başka ilah yoktur. Yalnız O’na tevekkül ettim ve O, yüce Arş’ın Rabbidir.',
      ur: 'مجھے اللہ ہی کافی ہے، اس کے سوا کوئی معبود نہیں، اسی پر میں نے بھروسہ کیا اور وہی عرشِ عظیم کا رب ہے۔',
      id: 'Cukuplah Allah bagiku; tidak ada Tuhan selain Dia. Hanya kepada-Nya aku bertawakal dan Dia adalah Tuhan yang memiliki Arsy yang agung.',
      es: 'Dios me basta, no hay más divinidad que Él. En Él confío y Él es el Señor del Trono inmenso.',
    },
  },
  {
    id: 'e1',
    category: 'evening',
    arabic:
      'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ.',
    count: 1,
    source: 'صحيح مسلم',
    translations: {
      en: 'We have reached the evening and at this very time all sovereignty belongs to Allah, and all praise is for Allah. None has the right to be worshipped except Allah alone.',
      fr: 'Nous voici au soir et la royauté appartient à Allah. Louange à Allah, il n’y a de divinité que Lui, Seul, sans associé.',
      tr: 'Akşama erdik, mülk de Allah’ın olarak akşamladı. Allah’a hamdolsun, O’ndan başka ilah yoktur.',
      ur: 'ہم نے شام کی اور تمام بادشاہت اللہ ہی کی ہے۔ تمام تعریفیں اللہ کے لیے ہیں، اس کے سوا کوئی معبود نہیں۔',
      id: 'Kami telah memasuki waktu petang dan kerajaan hanya milik Allah, segala puji bagi Allah. Tidak ada Tuhan selain Allah.',
      es: 'Hemos anochecido y el reino pertenece a Dios. Alabado sea Dios, no hay más divinidad que Él.',
    },
  },
  {
    id: 'e2',
    category: 'evening',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.',
    count: 3,
    source: 'صحيح مسلم',
    translations: {
      en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
      fr: 'Je cherche refuge auprès des paroles parfaites d’Allah contre le mal de ce qu’Il a créé.',
      tr: 'Yarattıklarının şerrinden Allah’ın eksiksiz kelimelerine sığınırım.',
      ur: 'میں اللہ کے کامل کلمات کے ذریعے اس کی مخلوق کے شر سے پناہ مانگتا ہوں۔',
      id: 'Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan apa yang Dia ciptakan.',
      es: 'Me refugio en las palabras perfectas de Dios contra el mal de lo que ha creado.',
    },
  },
  {
    id: 'e3',
    category: 'evening',
    arabic:
      'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ.',
    count: 1,
    source: 'المستدرك / حسنه الألباني',
    translations: {
      en: 'O Ever-Living, O Sustainer of all existence, in Your mercy I seek relief. Set right all my affairs and do not leave me to myself even for the blink of an eye.',
      fr: 'Ô Vivant, Ô Subsistant par Soi-même, j’implore Ton secours par Ta miséricorde. Améliore toute ma situation et ne me laisse pas à moi-même ne serait-ce qu’un clin d’œil.',
      tr: 'Ey Hayy ve Kayyûm olan Allah’ım! Rahmetinle yardım diliyorum. Bütün işlerimi düzelt ve beni göz açıp kapayıncaya kadar bile nefsime bırakma.',
      ur: 'اے زندہ و جاوید اور کائنات کو تھامنے والے! تیری رحمت کے وسیلے سے مدد چاہتا ہوں، میرے تمام معاملات درست فرما دے اور پلک جھپکنے کے برابر بھی مجھے میرے نفس کے حوالے نہ کر۔',
      id: 'Wahai Yang Maha Hidup, wahai Yang Maha Berdiri Sendiri, dengan rahmat-Mu aku memohon pertolongan. Perbaikilah segala urusanku dan jangan serahkan aku kepada diriku sendiri sekejap mata pun.',
      es: 'Oh Viviente, oh Sustentador, en Tu misericordia busco auxilio. Endereza todos mis asuntos y no me abandones a mí mismo ni por un abrir y cerrar de ojos.',
    },
  },
  {
    id: 'ap1',
    category: 'afterPrayer',
    arabic:
      'أَسْتَغْفِرُ اللَّهَ (ثلاثاً) اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.',
    count: 1,
    source: 'صحيح مسلم',
    translations: {
      en: 'I seek forgiveness from Allah (3x). O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of Majesty and Honor.',
      fr: 'Je demande pardon à Allah (3x). Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la Majesté et de la Générosité.',
      tr: 'Allah’tan bağışlanma dilerim (3x). Allah’ım, Sen Selâm’sın, esenlik Sendendir. Ey celal ve ikram sahibi, Sen mübareksin.',
      ur: 'میں اللہ سے بخشش مانگتا ہوں (3 بار)۔ اے اللہ! تو سلامتی والا ہے اور تیری ہی طرف سے سلامتی ہے، تو بابرکت ہے اے عظمت و بزرگی والے۔',
      id: 'Aku memohon ampun kepada Allah (3x). Ya Allah, Engkaulah As-Salam (Sumber Kedamaian) dan dari-Mu datang kedamaian. Maha Berkah Engkau, Pemilik Keagungan dan Kemuliaan.',
      es: 'Pido perdón a Dios (3x). Oh Dios, Tú eres la Paz y de Ti proviene la paz. Bendito seas, Poseedor de Majestad y Honor.',
    },
  },
  {
    id: 'ap2',
    category: 'afterPrayer',
    arabic:
      'اللَّهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ.',
    count: 1,
    source: 'سنن أبي داود',
    translations: {
      en: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner.',
      fr: 'Ô Allah, aide-moi à T’invoquer, à Te remercier et à T’adorer de la meilleure manière.',
      tr: 'Allah’ım! Seni zikretmek, Sana şükretmek ve Sana güzelce kulluk etmek için bana yardım et.',
      ur: 'اے اللہ! اپنے ذکر، اپنے شکر اور اپنی بہترین عبادت پر میری مدد فرما۔',
      id: 'Ya Allah, tolonglah aku untuk selalu mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.',
      es: 'Oh Dios, ayúdame a recordarte, a agradecerte y a adorarte de la mejor manera.',
    },
  },
  {
    id: 'ap3',
    category: 'afterPrayer',
    arabic: 'سُبْحَانَ اللَّهِ (٣٣) — الْحَمْدُ لِلَّهِ (٣٣) — اللَّهُ أَكْبَرُ (٣٣).',
    count: 33,
    source: 'متفق عليه',
    translations: {
      en: 'Glory be to Allah (33x) — Praise be to Allah (33x) — Allah is the Greatest (33x).',
      fr: 'Gloire à Allah (33x) — Louange à Allah (33x) — Allah est le Plus Grand (33x).',
      tr: 'Sübhanallah (33) — Elhamdülillah (33) — Allahu Ekber (33).',
      ur: 'سبحان اللہ (33) — الحمد للہ (33) — اللہ اکبر (33)۔',
      id: 'SubhanAllah (33x) — Alhamdulillah (33x) — Allahu Akbar (33x).',
      es: 'SubhanAllah (33x) — Alhamdulillah (33x) — Allahu Akbar (33x).',
    },
  },
  {
    id: 's1',
    category: 'sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.',
    count: 1,
    source: 'صحيح البخاري',
    translations: {
      en: 'In Your name, O Allah, I die and I live.',
      fr: 'En Ton nom, ô Allah, je meurs et je vis.',
      tr: 'Allah’ım! Senin adınla ölür ve Senin adınla dirilirim.',
      ur: 'اے اللہ! تیرے ہی نام کے ساتھ میں مرتا ہوں (سوتا ہوں) اور زندہ ہوتا ہوں (جاگتا ہوں)۔',
      id: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.',
      es: 'En Tu nombre, oh Dios, muero y vivo.',
    },
  },
  {
    id: 's2',
    category: 'sleep',
    arabic:
      'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ.',
    count: 3,
    source: 'سنن أبي داود والترمذي',
    translations: {
      en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
      fr: 'Ô Allah, préserve-moi de Ton châtiment le Jour où Tu ressusciteras Tes serviteurs.',
      tr: 'Allah’ım! Kullarını dirilteceğin gün azabından beni koru.',
      ur: 'اے اللہ! جس دن تو اپنے بندوں کو اٹھائے گا، اس دن کے عذاب سے مجھے بچا لینا۔',
      id: 'Ya Allah, lindungilah aku dari azab-Mu pada hari Engkau membangkitkan hamba-hamba-Mu.',
      es: 'Oh Dios, protégeme de Tu castigo el día en que resucites a Tus siervos.',
    },
  },
  {
    id: 'q1',
    category: 'quranicDuas',
    arabic:
      'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.',
    count: 1,
    source: 'سورة البقرة ٢٠١',
    translations: {
      en: 'Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.',
      fr: 'Seigneur ! Accorde-nous belle part ici-bas, et belle part aussi dans l’au-delà ; et protège-nous du châtiment du Feu !',
      tr: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.',
      ur: 'اے ہمارے رب! ہمیں دنیا میں بھی بھلائی عطا فرما اور آخرت میں بھی بھلائی عطا فرما اور ہمیں آگ کے عذاب سے بچا۔',
      id: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat dan peliharalah kami dari siksa neraka.',
      es: 'Señor nuestro, danos en esta vida algo bueno y en la otra vida algo bueno, y protégenos del castigo del Fuego.',
    },
  },
  {
    id: 'q2',
    category: 'quranicDuas',
    arabic:
      'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ.',
    count: 1,
    source: 'سورة آل عمران ٨',
    translations: {
      en: 'Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.',
      fr: 'Seigneur ! Ne laisse pas dévier nos cœurs après que Tu nous aies guidés ; et accorde-nous Ta miséricorde. C’est Toi, certes, le Grand Donateur.',
      tr: 'Rabbimiz! Bizi hidayete erdirdikten sonra kalplerimizi eğriltme ve katından bize bir rahmet bağışla. Şüphesiz Sen çok bağışlayansın.',
      ur: 'اے ہمارے رب! ہمیں ہدایت دینے کے بعد ہمارے دلوں کو ٹیڑھا نہ کرنا اور ہمیں اپنے پاس سے رحمت عطا فرما، بے شک تو ہی بہت عطا کرنے والا ہے۔',
      id: 'Ya Tuhan kami, janganlah Engkau jadikan hati kami condong kepada kesesatan sesudah Engkau beri petunjuk kepada kami, dan karuniakanlah kepada kami rahmat dari sisi-Mu.',
      es: 'Señor nuestro, no desvíes nuestros corazones después de habernos guiado, y concédenos misericordia de Tu parte. En verdad, Tú eres el Munífico.',
    },
  },
  {
    id: 'q3',
    category: 'quranicDuas',
    arabic:
      'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي.',
    count: 1,
    source: 'سورة طه ٢٥-٢٦',
    translations: {
      en: 'My Lord, expand for me my chest [with assurance] and ease for me my task.',
      fr: 'Seigneur, ouvre-moi ma poitrine et facilite ma tâche.',
      tr: 'Rabbim! Göğsüme genişlik ver ve işimi kolaylaştır.',
      ur: 'اے میرے رب! میرا سینہ کھول دے اور میرا کام آسان فرما دے۔',
      id: 'Ya Rabbku, lapangkanlah untukku dadaku dan mudahkanlah untukku urusanku.',
      es: 'Señor mío, ensancha mi pecho y facilítame mi tarea.',
    },
  },
];
