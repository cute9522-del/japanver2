window.TRIP_DATA = window.TRIP_DATA || {
  meta: {
    title: "日本行程",
    days: [
      { key:"day1", label:"Day1", date:"12/20", baseLocation:"名古屋", weatherQuery:"Nagoya" },
      { key:"day2", label:"Day2", date:"12/21", baseLocation:"高山", weatherQuery:"Takayama" },
      { key:"day3", label:"Day3", date:"12/22", baseLocation:"名古屋", weatherQuery:"Nagoya" },
      { key:"day4", label:"Day4", date:"12/23", baseLocation:"東京", weatherQuery:"Tokyo" },
      { key:"day5", label:"Day5", date:"12/24", baseLocation:"東京", weatherQuery:"Tokyo" },
      { key:"day6", label:"Day6", date:"12/25", baseLocation:"東京", weatherQuery:"Tokyo" },
      { key:"day7", label:"Day7", date:"12/26", baseLocation:"東京", weatherQuery:"Tokyo" },
      { key:"day8", label:"Day8", date:"12/27", baseLocation:"川越", weatherQuery:"Kawagoe" }
    ],
    cloudLinks: [
      { title: "票卷", url: "" },
      { title: "機票", url: "" },
      { title: "其他資料", url: "" }
    ]
  },
  itinerary: { day1:[], day2:[], day3:[], day4:[], day5:[], day6:[], day7:[], day8:[] },
  transportCards: [],
  flights: { outbound:{type:"transport", title:"去程航班"}, inbound:{type:"transport", title:"回程航班"}, extraLinkCard:{type:"transport", title:"航班連結"} },
  lodging: []
};