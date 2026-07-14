const propositions = [
  {
    id: "9nhgGFJ47NEvFKFn1p0C",//firestore随机生成的一串字符
    title: "June 11, 2026 FIFA World Cup: Czechia Defeats Czechia South Korea",//命题事件
    baseProbability: 58,//初始概率58%
    follow: 583,//关注人数
    createdAt:"timestamp",//创建时间
    creatorId: "dpVoWjwVUpTL6rY4rmIUD6b2xyg1",//创建者id
    updatedAt:"timestamp",//更新时间
    latestTriggerDate:"timestamp",//发生日期最新一条trigger的发生日期
    trendCache:"{d: 0, p: 16, t: 20260601}....",//所有的trigger的坐标值，d:即dir，0或1，0代表up，1代表down; p:pct*10; t:即date，按date时间排序先旧后新
    triggerCount:"36",//trigger数量
    triggers: [
  {
    authorId:"dpVoWjwVUpTL6rY4rmIUD6b2xyg1",//=creatorId
    createdAt:"timestamp",//创建时间
    dir: "down",//down是负影响，up是正影响
    pct: "4.2",//这条trigger对命题事件造成概率下降4.2%
    text: "新闻事件标题",
    date: "2026-01-25",//新闻事件发生时间
    url: "新闻事件的链接",
    basis: "[INITIAL PROBABILITY CONFIGURATION]: 由于这是date最老的也就是初始trigger，所以这里是baseProbability的根据，后续的trigger不用这个INITIAL PROBABILITY CONFIGURATION标题，也不用NEWS VOLATILITY FACTOR标题，直接写trigger的根据. [NEWS VOLATILITY FACTOR]:trigger的根据 ."
  },
]
  },
];

export default propositions;