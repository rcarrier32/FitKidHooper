/**
 * NBA player lists for "play like" pickers and favorite-player fields.
 * Active = top current-era stars; legends = notable players since 1990, excluding active list.
 */

export const NBA_PLAY_LIKE_ACTIVE = [
  "Steph Curry",
  "LeBron James",
  "Kevin Durant",
  "Giannis Antetokounmpo",
  "Luka Doncic",
  "Nikola Jokic",
  "Joel Embiid",
  "Jayson Tatum",
  "Anthony Edwards",
  "Shai Gilgeous-Alexander",
  "Damian Lillard",
  "Devin Booker",
  "Tyrese Haliburton",
  "Jalen Brunson",
  "Jimmy Butler",
  "Kawhi Leonard",
  "Paul George",
  "Ja Morant",
  "Zion Williamson",
  "Donovan Mitchell",
  "Trae Young",
  "LaMelo Ball",
  "Jaylen Brown",
  "Jrue Holiday",
  "Russell Westbrook",
  "James Harden",
  "Kyrie Irving",
  "Anthony Davis",
  "Bam Adebayo",
  "De'Aaron Fox",
  "Pascal Siakam",
  "DeMar DeRozan",
  "Julius Randle",
  "Karl-Anthony Towns",
  "Victor Wembanyama",
  "Chet Holmgren",
  "Paolo Banchero",
  "Scottie Barnes",
  "Evan Mobley",
  "Franz Wagner",
  "Jaren Jackson Jr.",
  "Domantas Sabonis",
  "Klay Thompson",
  "Draymond Green",
  "Rudy Gobert",
  "Bradley Beal",
  "Alperen Sengun",
  "Tyrese Maxey",
  "Mikal Bridges",
  "CJ McCollum",
];

const NBA_LEGENDS_SINCE_1990_RAW = [
  "Michael Jordan", "Magic Johnson", "Larry Bird", "Hakeem Olajuwon", "Shaquille O'Neal",
  "Kobe Bryant", "Tim Duncan", "Dirk Nowitzki", "Kevin Garnett", "Dwyane Wade",
  "Allen Iverson", "Vince Carter", "Tracy McGrady", "Penny Hardaway", "Scottie Pippen",
  "Charles Barkley", "Karl Malone", "John Stockton", "Gary Payton", "Reggie Miller",
  "Ray Allen", "Steve Nash", "Chris Paul", "Jason Kidd", "Paul Pierce",
  "Carmelo Anthony", "Dominique Wilkins", "Patrick Ewing", "David Robinson", "Dennis Rodman",
  "Alonzo Mourning", "Dikembe Mutombo", "Ben Wallace", "Chauncey Billups", "Rip Hamilton",
  "Manu Ginobili", "Tony Parker", "Pau Gasol", "Marc Gasol", "Yao Ming",
  "Grant Hill", "Clyde Drexler", "Chris Bosh", "Dwight Howard", "Blake Griffin",
  "Jason Richardson", "Mike Conley", "Kyle Lowry", "Joe Johnson", "Amar'e Stoudemire",
  "Shawn Marion", "Gilbert Arenas", "Brandon Roy", "Derrick Rose", "Chris Webber",
  "Mitch Richmond", "Mark Price", "Glen Rice", "Joe Dumars", "Isiah Thomas",
  "Moses Malone", "Al Horford", "Peja Stojakovic", "Vlade Divac", "Shawn Kemp",
  "Latrell Sprewell", "Jermaine O'Neal", "Antawn Jamison", "Michael Redd", "LaMarcus Aldridge",
  "DeMarcus Cousins", "John Wall", "Brandon Ingram", "Zach Randolph", "Rasheed Wallace",
  "Detlef Schrempf", "Metta World Peace", "Ben Gordon", "Luol Deng", "Andrew Bynum",
  "Sam Cassell", "Nick Van Exel", "Terrell Brandon", "Mark Jackson", "Tim Hardaway",
  "Muggsy Bogues", "Robert Horry", "Horace Grant", "Ron Harper", "John Starks",
  "Larry Johnson", "Glenn Robinson", "Antonio McDyess", "Shareef Abdur-Rahim", "Antoine Walker",
  "Jerry Stackhouse", "Michael Finley", "Allan Houston", "Latrell Sprewell", "Kenny Anderson",
  "Dell Curry", "Seth Curry", "Mark Eaton", "Rik Smits", "Brad Miller",
  "Toni Kukoc", "Detlef Schrempf", "Vlade Divac", "Drazen Petrovic", "Sarunas Marciulionis",
];

function normName(name) {
  return String(name || "").trim().toLowerCase();
}

const activeNorm = new Set(NBA_PLAY_LIKE_ACTIVE.map(normName));

/** Notable players since 1990, excluding the active top-50 list. */
export const NBA_PLAY_LIKE_LEGENDS = [...new Set(
  NBA_LEGENDS_SINCE_1990_RAW.filter(n => !activeNorm.has(normName(n))),
)].sort((a, b) => a.localeCompare(b));

/** Quick picks for onboarding (mix of active stars and legends). */
export const PLAY_LIKE_QUICK_PICKS = [
  "Steph Curry",
  "LeBron James",
  "Kevin Durant",
  "Allen Iverson",
  "Kyrie Irving",
  "Jalen Brunson",
  "Vince Carter",
  "Klay Thompson",
  "Anthony Edwards",
  "Victor Wembanyama",
  "Michael Jordan",
  "Kobe Bryant",
  "Ja Morant",
  "Giannis Antetokounmpo",
  "Luka Doncic",
  "Nikola Jokic",
];

export function filterPlayers(pool, query) {
  const list = pool === "legends" ? NBA_PLAY_LIKE_LEGENDS
    : pool === "active" ? NBA_PLAY_LIKE_ACTIVE
    : [...NBA_PLAY_LIKE_ACTIVE, ...NBA_PLAY_LIKE_LEGENDS];
  const trimmed = String(query || "").trim();
  if (!trimmed) return list;
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(name => {
    const norm = normName(name);
    const parts = norm.split(/\s+/);
    return tokens.every(t => norm.includes(t) || parts.some(p => p.startsWith(t)));
  });
}
