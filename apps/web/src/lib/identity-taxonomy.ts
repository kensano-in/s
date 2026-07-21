export interface OccupationCategory {
  name: string;
  titles: string[];
}

export const OCCUPATIONS: OccupationCategory[] = [
  {
    name: 'Technology',
    titles: [
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'AI Engineer',
      'Cybersecurity Analyst',
      'UI/UX Designer',
      'DevOps Engineer'
    ]
  },
  {
    name: 'Creative',
    titles: [
      'Photographer',
      'Filmmaker',
      'Music Producer',
      'Graphic Designer',
      'Fashion Designer'
    ]
  },
  {
    name: 'Business',
    titles: [
      'Entrepreneur',
      'Marketing Specialist',
      'Financial Analyst',
      'Startup Founder'
    ]
  },
  {
    name: 'Student',
    titles: [
      'High School Student',
      'College Student',
      'Engineering Student',
      'Medical Student'
    ]
  },
  {
    name: 'Medical',
    titles: [
      'Doctor',
      'Nurse',
      'Surgeon',
      'Pharmacist'
    ]
  }
];

export const EDUCATION_LEVELS = [
  'Secondary School',
  'Higher Secondary',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'Doctorate',
  'MBA',
  'Medical',
  'Engineering',
  'Law',
  'Research'
];

export const DEGREES = [
  'B.Tech',
  'M.Tech',
  'BE',
  'ME',
  'MBBS',
  'BDS',
  'MD',
  'BBA',
  'MBA',
  'B.Sc',
  'M.Sc',
  'BA',
  'MA',
  'LLB',
  'LLM'
];

export const FIELDS_OF_STUDY = [
  'Computer Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Biotechnology',
  'Medicine',
  'Law',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Finance',
  'Economics',
  'Political Science',
  'Journalism',
  'Psychology',
  'Fashion Design'
];

export interface CountryData {
  name: string;
  code: string;
  flag: string;
  states: Record<string, string[]>;
  institutions: string[];
}

export const COUNTRIES: Record<string, CountryData> = {
  "Australia": {
    "name": "Australia",
    "code": "AU",
    "flag": "🇦🇺",
    "states": {
      "New South Wales": [
        "Sydney"
      ],
      "Queensland": [
        "Brisbane"
      ],
      "South Australia": [
        "Adelaide"
      ],
      "Victoria": [
        "Melbourne"
      ],
      "Western Australia": [
        "Perth"
      ]
    },
    "institutions": [
      "ANU",
      "UNSW",
      "University of Melbourne",
      "University of Sydney"
    ]
  },
  "Canada": {
    "name": "Canada",
    "code": "CA",
    "flag": "🇨🇦",
    "states": {
      "Alberta": [
        "Calgary",
        "Edmonton"
      ],
      "British Columbia": [
        "Vancouver",
        "Victoria"
      ],
      "Manitoba": [
        "Winnipeg"
      ],
      "Nova Scotia": [
        "Halifax"
      ],
      "Ontario": [
        "Ottawa",
        "Toronto"
      ],
      "Quebec": [
        "Montreal",
        "Quebec City"
      ]
    },
    "institutions": [
      "McGill University",
      "UBC",
      "University of Toronto",
      "University of Waterloo"
    ]
  },
  "France": {
    "name": "France",
    "code": "FR",
    "flag": "🇫🇷",
    "states": {
      "Brittany": [
        "Brest",
        "Rennes"
      ],
      "Normandy": [
        "Caen",
        "Rouen"
      ],
      "Provence-Alpes-Côte d’Azur": [
        "Marseille",
        "Nice"
      ],
      "Île-de-France": [
        "Paris"
      ]
    },
    "institutions": [
      "PSL Research University",
      "Sorbonne University",
      "École Polytechnique"
    ]
  },
  "Germany": {
    "name": "Germany",
    "code": "DE",
    "flag": "🇩🇪",
    "states": {
      "Bavaria": [
        "Munich"
      ],
      "Berlin": [
        "Berlin"
      ],
      "Hamburg": [
        "Hamburg"
      ],
      "Hesse": [
        "Frankfurt"
      ],
      "Saxony": [
        "Leipzig"
      ]
    },
    "institutions": [
      "Heidelberg University",
      "Humboldt University of Berlin",
      "LMU Munich",
      "TU Munich"
    ]
  },
  "India": {
    "name": "India",
    "code": "IN",
    "flag": "🇮🇳",
    "states": {
      "Andaman and Nicobar Islands": [
        "Bambooflat",
        "Campbell Bay",
        "Car Nicobar",
        "Diglipur",
        "Garacharma",
        "Hut Bay",
        "Mayabunder",
        "Port Blair",
        "Rangat",
        "Shalimar"
      ],
      "Andhra Pradesh": [
        "Adoni",
        "Anantapur",
        "Bhimavaram",
        "Chittoor",
        "Dharmavaram",
        "Eluru",
        "Guntakal",
        "Guntur",
        "Hindupur",
        "Kadapa",
        "Kakinada",
        "Kurnool",
        "Machilipatnam",
        "Madanapalle",
        "Nandyal",
        "Nellore",
        "Ongole",
        "Proddatur",
        "Rajamahendravaram",
        "Srikakulam",
        "Tenali",
        "Tirupati",
        "Vijayawada",
        "Visakhapatnam",
        "Vizianagaram"
      ],
      "Arunachal Pradesh": [
        "Along",
        "Anini",
        "Basar",
        "Bomdila",
        "Changlang",
        "Daporijo",
        "Dirang",
        "Hawai",
        "Itanagar",
        "Khonsa",
        "Koloriang",
        "Longding",
        "Naharlagun",
        "Namsai",
        "Pasighat",
        "Roing",
        "Seppa",
        "Tawang",
        "Tezu",
        "Yingkiong",
        "Ziro"
      ],
      "Assam": [
        "Barpeta",
        "Bongaigaon",
        "Dhubri",
        "Dibrugarh",
        "Digboi",
        "Diphu",
        "Doomdooma",
        "Goalpara",
        "Golaghat",
        "Guwahati",
        "Haflong",
        "Hojai",
        "Jorhat",
        "Karimganj",
        "Kokrajhar",
        "Lumding",
        "Mangaldai",
        "Nagaon",
        "North Lakhimpur",
        "Silchar",
        "Sivasagar",
        "Tezpur",
        "Tinsukia"
      ],
      "Bihar": [
        "Arrah",
        "Aurangabad",
        "Begusarai",
        "Bettiah",
        "Bhagalpur",
        "Bihar Sharif",
        "Buxar",
        "Chhapra",
        "Darbhanga",
        "Gaya",
        "Hajipur",
        "Jamui",
        "Jehanabad",
        "Katihar",
        "Kishanganj",
        "Lakhisarai",
        "Motihari",
        "Munger",
        "Muzaffarpur",
        "Nawada",
        "Patna",
        "Purnia",
        "Saharsa",
        "Sasaram",
        "Siwan"
      ],
      "Chandigarh": [
        "Behlana",
        "Chandigarh",
        "Daria",
        "Karsan",
        "Maloya",
        "Mani Majra",
        "Mauli Jagran",
        "Sarangpur"
      ],
      "Chhattisgarh": [
        "Ambikapur",
        "Baikunthpur",
        "Balod",
        "Bemetara",
        "Bhilai",
        "Bilaspur",
        "Champa",
        "Dantewada",
        "Dhamtari",
        "Durg",
        "Jagdalpur",
        "Janjgir",
        "Jashpur",
        "Kanker",
        "Kawardha",
        "Kondagaon",
        "Korba",
        "Mahasamund",
        "Mungeli",
        "Raigarh",
        "Raipur",
        "Rajnandgaon"
      ],
      "Dadra and Nagar Haveli and Daman and Diu": [
        "Bhimpore",
        "Dadhel",
        "Dadra",
        "Daman",
        "Diu",
        "Dunetha",
        "Kachigam",
        "Naroli",
        "Silvassa"
      ],
      "Delhi": [
        "Alipur",
        "Chanakyapuri",
        "Connaught Place",
        "Dwarka",
        "Hauz Khas",
        "Janakpuri",
        "Karol Bagh",
        "Mayur Vihar",
        "Mehrauli",
        "Najafgarh",
        "Narela",
        "New Delhi",
        "Okhla",
        "Patel Nagar",
        "Pitampura",
        "Rajouri Garden",
        "Rohini",
        "Saket",
        "Seelampur",
        "Shahdara",
        "Vasant Kunj"
      ],
      "Goa": [
        "Aldona",
        "Benaulim",
        "Bicholim",
        "Calangute",
        "Canacona",
        "Colvale",
        "Cuncolim",
        "Curchorem",
        "Mapusa",
        "Margao",
        "Panaji",
        "Pernem",
        "Ponda",
        "Porvorim",
        "Quepem",
        "Sanguem",
        "Sanquelim",
        "Siolim",
        "Valpoi",
        "Vasco da Gama"
      ],
      "Gujarat": [
        "Ahmedabad",
        "Amreli",
        "Anand",
        "Bharuch",
        "Bhavnagar",
        "Bhuj",
        "Botad",
        "Gandhinagar",
        "Godhra",
        "Jamnagar",
        "Junagadh",
        "Mehsana",
        "Morbi",
        "Nadiad",
        "Navsari",
        "Palanpur",
        "Patan",
        "Porbandar",
        "Rajkot",
        "Surat",
        "Surendranagar",
        "Vadodara",
        "Valsad",
        "Vapi",
        "Veraval"
      ],
      "Haryana": [
        "Ambala",
        "Bahadurgarh",
        "Bhiwani",
        "Faridabad",
        "Fatehabad",
        "Gurugram",
        "Hansi",
        "Hisar",
        "Jhajjar",
        "Jind",
        "Kaithal",
        "Karnal",
        "Kurukshetra",
        "Narnaul",
        "Palwal",
        "Panchkula",
        "Panipat",
        "Rewari",
        "Rohtak",
        "Sirsa",
        "Sonipat",
        "Thanesar",
        "Yamunanagar"
      ],
      "Himachal Pradesh": [
        "Baddi",
        "Bilaspur",
        "Chamba",
        "Dalhousie",
        "Dharamshala",
        "Hamirpur",
        "Jogindernagar",
        "Kangra",
        "Keylong",
        "Kullu",
        "Manali",
        "Mandi",
        "Nahan",
        "Nalagarh",
        "Palampur",
        "Paonta Sahib",
        "Reckong Peo",
        "Shimla",
        "Solan",
        "Sundernagar",
        "Una"
      ],
      "Jammu and Kashmir": [
        "Akhnoor",
        "Anantnag",
        "Bandipora",
        "Baramulla",
        "Budgam",
        "Doda",
        "Ganderbal",
        "Jammu",
        "Kathua",
        "Kishtwar",
        "Kulgam",
        "Kupwara",
        "Poonch",
        "Pulwama",
        "Rajouri",
        "Ramban",
        "Reasi",
        "Samba",
        "Sopore",
        "Srinagar",
        "Udhampur"
      ],
      "Jharkhand": [
        "Bokaro Steel City",
        "Chaibasa",
        "Chas",
        "Chatra",
        "Deoghar",
        "Dhanbad",
        "Dumka",
        "Giridih",
        "Gumla",
        "Hazaribagh",
        "Jamshedpur",
        "Khunti",
        "Koderma",
        "Latehar",
        "Lohardaga",
        "Medininagar",
        "Pakur",
        "Phusro",
        "Ramgarh",
        "Ranchi",
        "Sahibganj",
        "Simdega"
      ],
      "Karnataka": [
        "Bagalkot",
        "Ballari",
        "Belagavi",
        "Bengaluru",
        "Bidar",
        "Chamarajanagar",
        "Chikkamagaluru",
        "Chitradurga",
        "Davanagere",
        "Gadag-Betageri",
        "Hassan",
        "Hosapete",
        "Hubballi-Dharwad",
        "Kalaburagi",
        "Karwar",
        "Kolar",
        "Mandya",
        "Mangaluru",
        "Mysuru",
        "Raichur",
        "Ramanagara",
        "Shivamogga",
        "Tumakuru",
        "Udupi",
        "Vijayapura",
        "Yadgir"
      ],
      "Kerala": [
        "Alappuzha",
        "Aluva",
        "Idukki",
        "Kalpetta",
        "Kanhangad",
        "Kannur",
        "Kasaragod",
        "Kochi",
        "Kollam",
        "Kottayam",
        "Koyilandy",
        "Kozhikode",
        "Malappuram",
        "Manjeri",
        "Neyyattinkara",
        "Palakkad",
        "Pathanamthitta",
        "Payyannur",
        "Ponnani",
        "Thalassery",
        "Thiruvananthapuram",
        "Thrissur",
        "Vatakara"
      ],
      "Ladakh": [
        "Diskit",
        "Dras",
        "Hunder",
        "Kargil",
        "Khaltsi",
        "Leh",
        "Nyoma",
        "Padum"
      ],
      "Lakshadweep": [
        "Agatti",
        "Amini",
        "Andrott",
        "Kadmat",
        "Kalpeni",
        "Kavaratti",
        "Kiltan",
        "Minicoy"
      ],
      "Madhya Pradesh": [
        "Bhind",
        "Bhopal",
        "Burhanpur",
        "Chhatarpur",
        "Chhindwara",
        "Damoh",
        "Dewas",
        "Guna",
        "Gwalior",
        "Indore",
        "Itarsi",
        "Jabalpur",
        "Katni",
        "Khandwa",
        "Khargone",
        "Mandsaur",
        "Neemuch",
        "Ratlam",
        "Rewa",
        "Sagar",
        "Satna",
        "Shivpuri",
        "Singrauli",
        "Ujjain",
        "Vidisha"
      ],
      "Maharashtra": [
        "Ahmednagar",
        "Akola",
        "Amravati",
        "Aurangabad",
        "Chandrapur",
        "Dhule",
        "Gondia",
        "Jalgaon",
        "Kalyan-Dombivli",
        "Kolhapur",
        "Latur",
        "Mira-Bhayandar",
        "Mumbai",
        "Nagpur",
        "Nanded",
        "Nashik",
        "Navi Mumbai",
        "Pimpri-Chinchwad",
        "Pune",
        "Ratnagiri",
        "Sangli",
        "Satara",
        "Solapur",
        "Thane",
        "Vasai-Virar",
        "Wardha",
        "Yavatmal"
      ],
      "Manipur": [
        "Bishnupur",
        "Chandel",
        "Churachandpur",
        "Imphal",
        "Jiribam",
        "Kakching",
        "Kamjong",
        "Kangpokpi",
        "Lilong",
        "Mayang Imphal",
        "Moirang",
        "Moreh",
        "Noney",
        "Pherzawl",
        "Senapati",
        "Tamenglong",
        "Tengnoupal",
        "Thoubal",
        "Ukhrul",
        "Wangjing"
      ],
      "Meghalaya": [
        "Baghmara",
        "Cherrapunji",
        "Dawki",
        "Jowai",
        "Khliehriat",
        "Laitumkhrah",
        "Madanrting",
        "Mairang",
        "Mawkyrwat",
        "Mylliem",
        "Nongpoh",
        "Nongstoin",
        "Nongthymmai",
        "Pynursla",
        "Resubelpara",
        "Shella",
        "Shillong",
        "Tura",
        "Umsning",
        "Williamnagar"
      ],
      "Mizoram": [
        "Aizawl",
        "Bairabi",
        "Biate",
        "Champhai",
        "Darlawn",
        "Hnahthial",
        "Kawrthah",
        "Khawzawl",
        "Kolasib",
        "Lawngtlai",
        "Lengpui",
        "Lunglei",
        "Mamit",
        "Saiha",
        "Sairang",
        "Saitual",
        "Serchhip",
        "Thenzawl",
        "Tlabung",
        "Vairengte"
      ],
      "Nagaland": [
        "Changtongya",
        "Chumoukedima",
        "Dimapur",
        "Kiphire",
        "Kohima",
        "Longleng",
        "Medziphema",
        "Mokokchung",
        "Mon",
        "Niuland",
        "Noklak",
        "Peren",
        "Pfutsero",
        "Phek",
        "Shamator",
        "Tseminyu",
        "Tuensang",
        "Tuli",
        "Wokha",
        "Zunheboto"
      ],
      "Odisha": [
        "Angul",
        "Balangir",
        "Balasore",
        "Barbil",
        "Bargarh",
        "Baripada",
        "Berhampur",
        "Bhadrak",
        "Bhawanipatna",
        "Bhubaneswar",
        "Cuttack",
        "Dhenkanal",
        "Jatni",
        "Jeypore",
        "Jharsuguda",
        "Kendujhar",
        "Khordha",
        "Koraput",
        "Paradip",
        "Phulbani",
        "Puri",
        "Rayagada",
        "Rourkela",
        "Sambalpur",
        "Sundargarh"
      ],
      "Puducherry": [
        "Ariyankuppam",
        "Karaikal",
        "Kurumbapet",
        "Mahe",
        "Ozhukarai",
        "Puducherry",
        "Villianur",
        "Yanam"
      ],
      "Punjab": [
        "Abohar",
        "Amritsar",
        "Barnala",
        "Bathinda",
        "Fazilka",
        "Firozpur",
        "Gurdaspur",
        "Hoshiarpur",
        "Jagraon",
        "Jalandhar",
        "Kapurthala",
        "Khanna",
        "Ludhiana",
        "Mansa",
        "Moga",
        "Mohali",
        "Muktsar",
        "Pathankot",
        "Patiala",
        "Phagwara",
        "Rupnagar",
        "Sangrur",
        "Tarn Taran"
      ],
      "Rajasthan": [
        "Ajmer",
        "Alwar",
        "Baran",
        "Barmer",
        "Beawar",
        "Bharatpur",
        "Bhilwara",
        "Bikaner",
        "Chittorgarh",
        "Churu",
        "Dholpur",
        "Hanumangarh",
        "Jaipur",
        "Jaisalmer",
        "Jhalawar",
        "Jhunjhunu",
        "Jodhpur",
        "Kishangarh",
        "Kota",
        "Pali",
        "Sawai Madhopur",
        "Sikar",
        "Sri Ganganagar",
        "Tonk",
        "Udaipur"
      ],
      "Sikkim": [
        "Chungthang",
        "Gangtok",
        "Geyzing",
        "Gyalshing",
        "Jorethang",
        "Lachen",
        "Lachung",
        "Legship",
        "Makha",
        "Mangan",
        "Melli",
        "Namchi",
        "Namthang",
        "Nayabazar",
        "Pakyong",
        "Rangpo",
        "Ravangla",
        "Rongli",
        "Singtam",
        "Soreng"
      ],
      "Tamil Nadu": [
        "Chennai",
        "Coimbatore",
        "Cuddalore",
        "Dindigul",
        "Erode",
        "Hosur",
        "Kanchipuram",
        "Karaikudi",
        "Karur",
        "Kumbakonam",
        "Madurai",
        "Nagercoil",
        "Neyveli",
        "Ooty",
        "Pollachi",
        "Ranipet",
        "Salem",
        "Sivakasi",
        "Thanjavur",
        "Thoothukudi",
        "Tiruchirappalli",
        "Tirunelveli",
        "Tiruppur",
        "Tiruvannamalai",
        "Vellore"
      ],
      "Telangana": [
        "Adilabad",
        "Bhongir",
        "Gadwal",
        "Hyderabad",
        "Jagtial",
        "Kamareddy",
        "Karimnagar",
        "Khammam",
        "Kothagudem",
        "Mahbubnagar",
        "Mancherial",
        "Medak",
        "Miryalaguda",
        "Nalgonda",
        "Nirmal",
        "Nizamabad",
        "Peddapalli",
        "Ramagundam",
        "Sangareddy",
        "Siddipet",
        "Suryapet",
        "Vikarabad",
        "Wanaparthy",
        "Warangal"
      ],
      "Tripura": [
        "Agartala",
        "Amarpur",
        "Ambassa",
        "Belonia",
        "Bishalgarh",
        "Dharmanagar",
        "Jirania",
        "Kailasahar",
        "Kamalpur",
        "Khowai",
        "Kumarghat",
        "Melaghar",
        "Mohanpur",
        "Panisagar",
        "Ranirbazar",
        "Sabroom",
        "Santirbazar",
        "Sonamura",
        "Teliamura",
        "Udaipur"
      ],
      "Uttar Pradesh": [
        "Agra",
        "Aligarh",
        "Amroha",
        "Ayodhya",
        "Bareilly",
        "Bulandshahr",
        "Etawah",
        "Farrukhabad",
        "Firozabad",
        "Ghaziabad",
        "Gorakhpur",
        "Hapur",
        "Jhansi",
        "Kanpur",
        "Lucknow",
        "Mathura",
        "Meerut",
        "Mirzapur",
        "Moradabad",
        "Muzaffarnagar",
        "Noida",
        "Prayagraj",
        "Rae Bareli",
        "Rampur",
        "Saharanpur",
        "Sambhal",
        "Shahjahanpur",
        "Varanasi"
      ],
      "Uttarakhand": [
        "Almora",
        "Bageshwar",
        "Champawat",
        "Dehradun",
        "Gopeshwar",
        "Haldwani",
        "Haridwar",
        "Kashipur",
        "Manglaur",
        "Mussoorie",
        "Nainital",
        "Pauri",
        "Pithoragarh",
        "Ramnagar",
        "Ranikhet",
        "Rishikesh",
        "Roorkee",
        "Rudraprayag",
        "Rudrapur",
        "Srinagar",
        "Tehri",
        "Uttarkashi"
      ],
      "West Bengal": [
        "Alipurduar",
        "Asansol",
        "Baharampur",
        "Balurghat",
        "Bankura",
        "Bardhaman",
        "Barrackpore",
        "Basirhat",
        "Cooch Behar",
        "Darjeeling",
        "Diamond Harbour",
        "Durgapur",
        "Habra",
        "Haldia",
        "Howrah",
        "Jalpaiguri",
        "Kalyani",
        "Kharagpur",
        "Kolkata",
        "Krishnanagar",
        "Malda",
        "Midnapore",
        "Purulia",
        "Raiganj",
        "Siliguri"
      ]
    },
    "institutions": [
      "BITS Pilani",
      "Calcutta University",
      "Delhi University",
      "IIT Bombay",
      "IIT Delhi",
      "IIT Kharagpur",
      "Jadavpur University",
      "NIT Trichy",
      "Presidency University",
      "Vellore Institute of Technology"
    ]
  },
  "Japan": {
    "name": "Japan",
    "code": "JP",
    "flag": "🇯🇵",
    "states": {
      "Hokkaido": [
        "Sapporo"
      ],
      "Kyoto": [
        "Kyoto"
      ],
      "Okinawa": [
        "Naha"
      ],
      "Osaka": [
        "Osaka"
      ],
      "Tokyo": [
        "Tokyo"
      ]
    },
    "institutions": [
      "Kyoto University",
      "Osaka University",
      "Tohoku University",
      "University of Tokyo"
    ]
  },
  "Singapore": {
    "name": "Singapore",
    "code": "SG",
    "flag": "🇸🇬",
    "states": {
      "Central Region": [
        "Marina Bay",
        "Orchard"
      ],
      "East Region": [
        "Tampines"
      ],
      "North Region": [
        "Woodlands"
      ],
      "West Region": [
        "Jurong"
      ]
    },
    "institutions": [
      "Nanyang Technological University (NTU)",
      "National University of Singapore (NUS)",
      "SMU"
    ]
  },
  "UAE": {
    "name": "United Arab Emirates",
    "code": "AE",
    "flag": "🇦🇪",
    "states": {
      "Abu Dhabi": [
        "Abu Dhabi",
        "Al Ain"
      ],
      "Ajman": [
        "Ajman"
      ],
      "Dubai": [
        "Dubai"
      ],
      "Sharjah": [
        "Sharjah"
      ]
    },
    "institutions": [
      "American University of Sharjah",
      "Khalifa University",
      "United Arab Emirates University"
    ]
  },
  "United Kingdom": {
    "name": "United Kingdom",
    "code": "GB",
    "flag": "🇬🇧",
    "states": {
      "England": [
        "Birmingham",
        "Bristol",
        "Leeds",
        "Liverpool",
        "London",
        "Manchester"
      ],
      "Northern Ireland": [
        "Belfast"
      ],
      "Scotland": [
        "Edinburgh",
        "Glasgow"
      ],
      "Wales": [
        "Cardiff"
      ]
    },
    "institutions": [
      "Cambridge University",
      "Imperial College London",
      "LSE",
      "Oxford University",
      "UCL"
    ]
  },
  "United States": {
    "name": "United States",
    "code": "US",
    "flag": "🇺🇸",
    "states": {
      "Arizona": [
        "Phoenix",
        "Tucson"
      ],
      "California": [
        "Los Angeles",
        "Sacramento",
        "San Diego",
        "San Francisco",
        "San Jose"
      ],
      "Florida": [
        "Miami",
        "Orlando",
        "Tampa"
      ],
      "Georgia": [
        "Atlanta",
        "Savannah"
      ],
      "Illinois": [
        "Chicago",
        "Naperville"
      ],
      "Massachusetts": [
        "Boston",
        "Cambridge"
      ],
      "Nevada": [
        "Las Vegas",
        "Reno"
      ],
      "New Jersey": [
        "Jersey City",
        "Newark"
      ],
      "New York": [
        "Albany",
        "Buffalo",
        "New York City"
      ],
      "North Carolina": [
        "Charlotte",
        "Raleigh"
      ],
      "Ohio": [
        "Cleveland",
        "Columbus"
      ],
      "Pennsylvania": [
        "Philadelphia",
        "Pittsburgh"
      ],
      "Texas": [
        "Austin",
        "Dallas",
        "Houston",
        "San Antonio"
      ],
      "Virginia": [
        "Richmond",
        "Virginia Beach"
      ],
      "Washington": [
        "Bellevue",
        "Seattle"
      ]
    },
    "institutions": [
      "Caltech",
      "Columbia University",
      "Harvard University",
      "MIT",
      "NYU",
      "Stanford University",
      "UC Berkeley",
      "UCLA"
    ]
  }
};

export const PRONOUNS = [
  'he/him',
  'she/her',
  'they/them',
  'he/they',
  'she/they'
];

export const MULTILINGUAL_PRONOUN_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Arabic',
  'Hindi',
  'Japanese',
  'Korean',
  'Swedish',
  'Norwegian',
  'Dutch',
  'Turkish'
];

export function getLinkageSuggestions(degree?: string, fieldOfStudy?: string) {
  const suggestions: { fieldOfStudy?: string; occupation?: string } = {};

  if (degree) {
    const d = degree.toUpperCase();
    if (d === 'MBBS' || d === 'MD' || d === 'BDS') {
      suggestions.fieldOfStudy = 'Medicine';
      suggestions.occupation = 'Doctor';
    } else if (d === 'B.TECH' || d === 'M.TECH' || d === 'BE' || d === 'ME') {
      suggestions.fieldOfStudy = 'Engineering';
      suggestions.occupation = 'Software Engineer';
    } else if (d === 'LLB' || d === 'LLM') {
      suggestions.fieldOfStudy = 'Law';
      suggestions.occupation = 'Lawyer';
    } else if (d === 'MBA' || d === 'BBA') {
      suggestions.fieldOfStudy = 'Finance';
      suggestions.occupation = 'Consultant';
    }
  }

  if (fieldOfStudy) {
    const f = fieldOfStudy.toLowerCase();
    if (f.includes('computer science') || f.includes('software')) {
      suggestions.occupation = 'Software Engineer';
    } else if (f.includes('intelligence') || f.includes('ai') || f.includes('machine learning')) {
      suggestions.occupation = 'AI Engineer';
    } else if (f.includes('cyber') || f.includes('security')) {
      suggestions.occupation = 'Cybersecurity Analyst';
    } else if (f.includes('design') || f.includes('ui') || f.includes('ux')) {
      suggestions.occupation = 'UI/UX Designer';
    } else if (f.includes('medicine')) {
      suggestions.occupation = 'Doctor';
    } else if (f.includes('law')) {
      suggestions.occupation = 'Lawyer';
    }
  }

  return suggestions;
}
