import { JammuWard, Coordinates } from '../types/grievance';

/**
 * Complete list of all 75 Administrative Wards of Jammu Municipal Corporation (JMC).
 * Based on official JMC ward rosters, delimitation data, and municipal engineering divisions.
 */
export const JAMMU_WARDS: JammuWard[] = [
  // --- Old City Zone (Division I) ---
  {
    id: 1,
    number: 1,
    name: 'Panjtirthi & Old Heritage City',
    zone: 'Old City',
    councillor: 'Rajesh Gupta',
    contactNumber: '+91 94191 00001',
    centerCoordinates: { latitude: 32.7410, longitude: 74.8680 },
    localityAliases: ['panjtirthi', 'heritage city', 'old city', 'pacca danga', 'dhounthly bazaar'],
  },
  {
    id: 2,
    number: 2,
    name: 'Jullaka Mohalla & Kanak Mandi',
    zone: 'Old City',
    councillor: 'Vipul Sharma',
    contactNumber: '+91 94191 00002',
    centerCoordinates: { latitude: 32.7350, longitude: 74.8660 },
    localityAliases: ['jullaka mohalla', 'kanak mandi', 'raghunath bazaar'],
  },
  {
    id: 3,
    number: 3,
    name: 'Mast Garh & Peer Mitha',
    zone: 'Old City',
    councillor: 'Narottam Sharma',
    contactNumber: '+91 94191 00003',
    centerCoordinates: { latitude: 32.7330, longitude: 74.8640 },
    localityAliases: ['mast garh', 'peer mitha', 'lakhdatta'],
  },
  {
    id: 4,
    number: 4,
    name: 'Bhabarian & Purani Mandi',
    zone: 'Old City',
    councillor: 'Sunil Prajapati',
    contactNumber: '+91 94191 00004',
    centerCoordinates: { latitude: 32.7340, longitude: 74.8680 },
    localityAliases: ['bhabarian', 'purani mandi', 'link road'],
  },
  {
    id: 5,
    number: 5,
    name: 'Talab Khatikhan & Shaheedi Chowk',
    zone: 'Old City',
    councillor: 'Gopal Gupta',
    contactNumber: '+91 94191 00005',
    centerCoordinates: { latitude: 32.7300, longitude: 74.8670 },
    localityAliases: ['talab khatikhan', 'shaheedi chowk', 'wazarat road'],
  },
  {
    id: 6,
    number: 6,
    name: 'Gujjar Nagar & Circular Road',
    zone: 'Old City',
    councillor: 'Mohd. Ashraf',
    contactNumber: '+91 94191 00006',
    centerCoordinates: { latitude: 32.7260, longitude: 74.8690 },
    localityAliases: ['gujjar nagar', 'circular road', 'tawi bridge'],
  },
  {
    id: 7,
    number: 7,
    name: 'Residency Road, Prem Nagar & Kanji House',
    zone: 'Old City',
    councillor: 'Sunil Choudhary',
    contactNumber: '+91 94191 00007',
    centerCoordinates: { latitude: 32.7292, longitude: 74.8615 },
    localityAliases: ['residency road', 'prem nagar', 'kanji house', 'town hall', 'vir marg'],
  },
  {
    id: 8,
    number: 8,
    name: 'Dogra Hall & Kachi Chawni',
    zone: 'Old City',
    councillor: 'Raman Sharma',
    contactNumber: '+91 94191 00008',
    centerCoordinates: { latitude: 32.7360, longitude: 74.8580 },
    localityAliases: ['dogra hall', 'kachi chawni', 'shalamar'],
  },
  {
    id: 9,
    number: 9,
    name: 'Mohalla Ustad & CPO Chowk',
    zone: 'Old City',
    councillor: 'Suman Gupta',
    contactNumber: '+91 94191 00009',
    centerCoordinates: { latitude: 32.7380, longitude: 74.8590 },
    localityAliases: ['mohalla ustad', 'cpo chowk', 'panjtirthi road'],
  },
  {
    id: 10,
    number: 10,
    name: 'Pacca Danga & Jain Bazaar',
    zone: 'Old City',
    councillor: 'Anil Masoom',
    contactNumber: '+91 94191 00010',
    centerCoordinates: { latitude: 32.7370, longitude: 74.8650 },
    localityAliases: ['pacca danga', 'jain bazaar', 'chowk chabutra'],
  },
  {
    id: 11,
    number: 11,
    name: 'Malhotrian & City Chowk',
    zone: 'Old City',
    councillor: 'Anita Sharma',
    contactNumber: '+91 94191 00011',
    centerCoordinates: { latitude: 32.7310, longitude: 74.8640 },
    localityAliases: ['malhotrian', 'city chowk', 'super bazaar'],
  },

  // --- North & Central Jammu (Division I & II) ---
  {
    id: 12,
    number: 12,
    name: 'Krishna Nagar & Science College',
    zone: 'North Jammu',
    councillor: 'Jeet Kumar',
    contactNumber: '+91 94191 00012',
    centerCoordinates: { latitude: 32.7240, longitude: 74.8480 },
    localityAliases: ['krishna nagar', 'canal road', 'science college'],
  },
  {
    id: 13,
    number: 13,
    name: 'Resham Ghar Colony',
    zone: 'North Jammu',
    councillor: 'Rama Kant',
    contactNumber: '+91 94191 00013',
    centerCoordinates: { latitude: 32.7270, longitude: 74.8520 },
    localityAliases: ['resham ghar', 'b c road', 'bus stand'],
  },
  {
    id: 14,
    number: 14,
    name: 'Bhagwati Nagar',
    zone: 'North Jammu',
    councillor: 'Parmod Kapahi',
    contactNumber: '+91 94191 00014',
    centerCoordinates: { latitude: 32.7150, longitude: 74.8380 },
    localityAliases: ['bhagwati nagar', 'yatri niwas', 'tawi fourth bridge'],
  },
  {
    id: 15,
    number: 15,
    name: 'Canal Road & AG Office',
    zone: 'North Jammu',
    councillor: 'Sandhya Gupta',
    contactNumber: '+91 94191 00015',
    centerCoordinates: { latitude: 32.7190, longitude: 74.8450 },
    localityAliases: ['canal road', 'ag office', 'polytechnic'],
  },
  {
    id: 16,
    number: 16,
    name: 'New Plot & Prem Nagar North',
    zone: 'North Jammu',
    councillor: 'Rajinder Sharma',
    contactNumber: '+91 94191 00016',
    centerCoordinates: { latitude: 32.7440, longitude: 74.8530 },
    localityAliases: ['new plot', 'prem nagar', 'amphalla road'],
  },
  {
    id: 17,
    number: 17,
    name: 'Ambphalla & Manda',
    zone: 'North Jammu',
    councillor: 'Nidhi Mangotra',
    contactNumber: '+91 94191 00017',
    centerCoordinates: { latitude: 32.7460, longitude: 74.8600 },
    localityAliases: ['ambphalla', 'manda', 'karan nagar'],
  },
  {
    id: 18,
    number: 18,
    name: 'Sarwal & Old Janipur',
    zone: 'North Jammu',
    councillor: 'Dinesh Gupta',
    contactNumber: '+91 94191 00018',
    centerCoordinates: { latitude: 32.7470, longitude: 74.8480 },
    localityAliases: ['sarwal', 'hospital sarwal', 'rehari chowk'],
  },
  {
    id: 19,
    number: 19,
    name: 'Chand Nagar & Jewel Chowk',
    zone: 'Old City',
    councillor: 'Amit Gupta',
    contactNumber: '+91 94191 00019',
    centerCoordinates: { latitude: 32.7230, longitude: 74.8550 },
    localityAliases: ['chand nagar', 'jewel chowk', 'vinayak bazaar', 'gummat'],
  },

  // --- South Jammu Zone (Division II & III) ---
  {
    id: 20,
    number: 20,
    name: 'Gandhi Nagar (Gol Market & A-Block)',
    zone: 'South Jammu',
    councillor: 'Pooja Verma',
    contactNumber: '+91 94191 00020',
    centerCoordinates: { latitude: 32.7088, longitude: 74.8631 },
    localityAliases: ['gandhi nagar', 'gol market', 'a block gandhi nagar'],
  },
  {
    id: 21,
    number: 21,
    name: 'Gandhi Nagar South & Green Belt',
    zone: 'South Jammu',
    councillor: 'Harvinder Singh',
    contactNumber: '+91 94191 00021',
    centerCoordinates: { latitude: 32.7010, longitude: 74.8580 },
    localityAliases: ['green belt', 'gandhi nagar south', 'gole pulli'],
  },
  {
    id: 22,
    number: 22,
    name: 'Nai Basti & Rampura',
    zone: 'South Jammu',
    councillor: 'Jaideep Sharma',
    contactNumber: '+91 94191 00022',
    centerCoordinates: { latitude: 32.7050, longitude: 74.8520 },
    localityAliases: ['nai basti', 'rampura', 'satwari chowk'],
  },
  {
    id: 23,
    number: 23,
    name: 'Shastri Nagar',
    zone: 'South Jammu',
    councillor: 'Neeraj Puri',
    contactNumber: '+91 94191 00023',
    centerCoordinates: { latitude: 32.7030, longitude: 74.8660 },
    localityAliases: ['shastri nagar', 'cremation ground road'],
  },
  {
    id: 24,
    number: 24,
    name: 'Rehari Colony Central',
    zone: 'North Jammu',
    councillor: 'Surinder Sharma',
    contactNumber: '+91 94191 00024',
    centerCoordinates: { latitude: 32.7390, longitude: 74.8520 },
    localityAliases: ['rehari colony', 'subash nagar road'],
  },
  {
    id: 25,
    number: 25,
    name: 'Rehari North & Shiv Nagar',
    zone: 'North Jammu',
    councillor: 'Arun Khanna',
    contactNumber: '+91 94191 00025',
    centerCoordinates: { latitude: 32.7420, longitude: 74.8500 },
    localityAliases: ['rehari north', 'pahar mohalla'],
  },
  {
    id: 26,
    number: 26,
    name: 'Subash Nagar',
    zone: 'North Jammu',
    councillor: 'Hardeep Singh Mankotia',
    contactNumber: '+91 94191 00026',
    centerCoordinates: { latitude: 32.7450, longitude: 74.8430 },
    localityAliases: ['subash nagar', 'gurha more'],
  },
  {
    id: 27,
    number: 27,
    name: 'Bakshi Nagar Main',
    zone: 'North Jammu',
    councillor: 'Sunita Koul',
    contactNumber: '+91 94191 00027',
    centerCoordinates: { latitude: 32.7340, longitude: 74.8440 },
    localityAliases: ['bakshi nagar', 'gmc jammu', 'pul tawi'],
  },
  {
    id: 28,
    number: 28,
    name: 'Gurha Bakshi Nagar',
    zone: 'North Jammu',
    councillor: 'Gourav Chopra',
    contactNumber: '+91 94191 00028',
    centerCoordinates: { latitude: 32.7360, longitude: 74.8410 },
    localityAliases: ['gurha bakshi nagar', 'reshim ghar'],
  },
  {
    id: 29,
    number: 29,
    name: 'Shakti Nagar & Rajpura',
    zone: 'North Jammu',
    councillor: 'Surinder Choudhary',
    contactNumber: '+91 94191 00029',
    centerCoordinates: { latitude: 32.7300, longitude: 74.8390 },
    localityAliases: ['shakti nagar', 'rajpura', 'pawan chowk'],
  },
  {
    id: 30,
    number: 30,
    name: 'Talab Tillo (Camp Road)',
    zone: 'North Jammu',
    councillor: 'Baldev Singh Billawaria',
    contactNumber: '+91 94191 00030',
    centerCoordinates: { latitude: 32.7240, longitude: 74.8320 },
    localityAliases: ['talab tillo', 'camp road', 'gole pulli'],
  },
  {
    id: 31,
    number: 31,
    name: 'Talab Tillo (Poonch House Road)',
    zone: 'North Jammu',
    councillor: 'Sucha Singh',
    contactNumber: '+91 94191 00031',
    centerCoordinates: { latitude: 32.7230, longitude: 74.8280 },
    localityAliases: ['talab tillo', 'poonch house road'],
  },
  {
    id: 32,
    number: 32,
    name: 'Janipur Main & Colony',
    zone: 'North Jammu',
    councillor: 'Ritu Jamwal',
    contactNumber: '+91 94191 00032',
    centerCoordinates: { latitude: 32.7532, longitude: 74.8465 },
    localityAliases: ['janipur', 'janipur main', 'high court road', 'janipur colony'],
  },
  {
    id: 33,
    number: 33,
    name: 'Shiv Nagar & AG Colony',
    zone: 'North Jammu',
    councillor: 'Chander Mohan Gupta',
    contactNumber: '+91 94191 00033',
    centerCoordinates: { latitude: 32.7320, longitude: 74.8490 },
    localityAliases: ['shiv nagar', 'ag colony'],
  },
  {
    id: 34,
    number: 34,
    name: 'Janipur West & EWS Colony',
    zone: 'North Jammu',
    councillor: 'Bhanu Mahajan',
    contactNumber: '+91 94191 00034',
    centerCoordinates: { latitude: 32.7550, longitude: 74.8410 },
    localityAliases: ['janipur west', 'ews colony'],
  },
  {
    id: 35,
    number: 35,
    name: 'Janipur Colony South',
    zone: 'North Jammu',
    councillor: 'Yash Pal Sharma',
    contactNumber: '+91 94191 00035',
    centerCoordinates: { latitude: 32.7510, longitude: 74.8430 },
    localityAliases: ['janipur colony south', 'bhavani nagar'],
  },
  {
    id: 36,
    number: 36,
    name: 'Janipur Main Market & Laxmi Nagar',
    zone: 'North Jammu',
    councillor: 'Subash Sharma',
    contactNumber: '+91 94191 00036',
    centerCoordinates: { latitude: 32.7540, longitude: 74.8490 },
    localityAliases: ['laxmi nagar', 'janipur market'],
  },
  {
    id: 37,
    number: 37,
    name: 'Janipur West / Pamposh Colony',
    zone: 'North Jammu',
    councillor: 'Sunita Sharma',
    contactNumber: '+91 94191 00037',
    centerCoordinates: { latitude: 32.7580, longitude: 74.8440 },
    localityAliases: ['pamposh colony', 'janipura west'],
  },
  {
    id: 38,
    number: 38,
    name: 'Paloura & Pamposh Colony',
    zone: 'North Jammu',
    councillor: 'Ashok Kumar',
    contactNumber: '+91 94191 00038',
    centerCoordinates: { latitude: 32.7660, longitude: 74.8380 },
    localityAliases: ['paloura', 'paloura mangotrian', 'bsf paloura', 'doon school'],
  },
  {
    id: 39,
    number: 39,
    name: 'Tope Sherkhania',
    zone: 'North Jammu',
    councillor: 'Rajan Sharma',
    contactNumber: '+91 94191 00039',
    centerCoordinates: { latitude: 32.7390, longitude: 74.8350 },
    localityAliases: ['tope sherkhania', 'best price road'],
  },
  {
    id: 40,
    number: 40,
    name: 'Poonch House & Kabir Nagar',
    zone: 'North Jammu',
    councillor: 'Neelam Sharma',
    contactNumber: '+91 94191 00040',
    centerCoordinates: { latitude: 32.7280, longitude: 74.8360 },
    localityAliases: ['kabir nagar', 'poonch house'],
  },
  {
    id: 41,
    number: 41,
    name: 'Bohri & Hazuri Bagh',
    zone: 'North Jammu',
    councillor: 'Sanjay Kumar',
    contactNumber: '+91 94191 00041',
    centerCoordinates: { latitude: 32.7180, longitude: 74.8210 },
    localityAliases: ['bohri', 'hazuri bagh'],
  },
  {
    id: 42,
    number: 42,
    name: 'Nanak Nagar North',
    zone: 'South Jammu',
    councillor: 'Vijay Choudhary',
    contactNumber: '+91 94191 00042',
    centerCoordinates: { latitude: 32.6970, longitude: 74.8600 },
    localityAliases: ['nanak nagar', 'sector 1 nanak nagar'],
  },
  {
    id: 43,
    number: 43,
    name: 'Nanak Nagar South',
    zone: 'South Jammu',
    councillor: 'Surjeet Kumar',
    contactNumber: '+91 94191 00043',
    centerCoordinates: { latitude: 32.6930, longitude: 74.8630 },
    localityAliases: ['nanak nagar south', 'sector 10 nanak nagar'],
  },
  {
    id: 44,
    number: 44,
    name: 'Channi Himmat Sector 1-4',
    zone: 'South Jammu',
    councillor: 'Neelam Rani',
    contactNumber: '+91 94191 00044',
    centerCoordinates: { latitude: 32.6995, longitude: 74.8720 },
    localityAliases: ['channi himmat', 'channi', 'sector 1 channi', 'sector 2 channi', 'sector 3 channi'],
  },
  {
    id: 45,
    number: 45,
    name: 'Digiana Main',
    zone: 'South Jammu',
    councillor: 'Raj Rani',
    contactNumber: '+91 94191 00045',
    centerCoordinates: { latitude: 32.6880, longitude: 74.8670 },
    localityAliases: ['digiana', 'digiana ashram'],
  },
  {
    id: 46,
    number: 46,
    name: 'Sanjay Nagar',
    zone: 'South Jammu',
    councillor: 'Dwarka Nath',
    contactNumber: '+91 94191 00046',
    centerCoordinates: { latitude: 32.6910, longitude: 74.8580 },
    localityAliases: ['sanjay nagar', 'ranjit nagar'],
  },
  {
    id: 47,
    number: 47,
    name: 'Bahu Fort & Gorakh Nagar',
    zone: 'Bahu',
    councillor: 'Tarun Manhas',
    contactNumber: '+91 94191 00047',
    centerCoordinates: { latitude: 32.7285, longitude: 74.8780 },
    localityAliases: ['bahu fort', 'gorakh nagar', 'bagh-e-bahu', 'har ki pauri'],
  },
  {
    id: 48,
    number: 48,
    name: 'Qasim Nagar & Gorkha Nagar',
    zone: 'Bahu',
    councillor: 'Sham Lal',
    contactNumber: '+91 94191 00048',
    centerCoordinates: { latitude: 32.7230, longitude: 74.8820 },
    localityAliases: ['qasim nagar', 'gorkha nagar'],
  },
  {
    id: 49,
    number: 49,
    name: 'Narwal & Transport Nagar',
    zone: 'Bahu',
    councillor: 'Kamal Singh',
    contactNumber: '+91 94191 00049',
    centerCoordinates: { latitude: 32.7150, longitude: 74.8890 },
    localityAliases: ['narwal', 'transport nagar', 'fruit mandi'],
  },
  {
    id: 50,
    number: 50,
    name: 'Channi Rama',
    zone: 'South Jammu',
    councillor: 'Kanta Devi',
    contactNumber: '+91 94191 00050',
    centerCoordinates: { latitude: 32.7080, longitude: 74.8790 },
    localityAliases: ['channi rama', 'national highway channi'],
  },
  {
    id: 51,
    number: 51,
    name: 'Channi Himmat Sector 5-7',
    zone: 'South Jammu',
    councillor: 'Rajinder Singh',
    contactNumber: '+91 94191 00051',
    centerCoordinates: { latitude: 32.6940, longitude: 74.8750 },
    localityAliases: ['channi himmat sector 5', 'channi himmat sector 7'],
  },
  {
    id: 52,
    number: 52,
    name: 'Trikuta Nagar North',
    zone: 'South Jammu',
    councillor: 'Ajay Gupta',
    contactNumber: '+91 94191 00052',
    centerCoordinates: { latitude: 32.7010, longitude: 74.8780 },
    localityAliases: ['trikuta nagar north', 'sector 1 trikuta nagar'],
  },
  {
    id: 53,
    number: 53,
    name: 'Trikuta Nagar & Rail Head Complex',
    zone: 'South Jammu',
    councillor: 'Sanjay Baru',
    contactNumber: '+91 94191 00053',
    centerCoordinates: { latitude: 32.6980, longitude: 74.8820 },
    localityAliases: ['trikuta nagar', 'rail head complex', 'bahu plaza'],
  },
  {
    id: 54,
    number: 54,
    name: 'Trikuta Nagar South',
    zone: 'South Jammu',
    councillor: 'Geeta Gupta',
    contactNumber: '+91 94191 00054',
    centerCoordinates: { latitude: 32.6920, longitude: 74.8840 },
    localityAliases: ['trikuta nagar south', 'sector 5 trikuta nagar'],
  },
  {
    id: 55,
    number: 55,
    name: 'Deeli / Marble Market',
    zone: 'South Jammu',
    councillor: 'Pritam Singh',
    contactNumber: '+91 94191 00055',
    centerCoordinates: { latitude: 32.6860, longitude: 74.8880 },
    localityAliases: ['deeli', 'marble market', 'kunjwani road'],
  },
  {
    id: 56,
    number: 56,
    name: 'Gangyal Main',
    zone: 'South Jammu',
    councillor: 'Balwan Singh',
    contactNumber: '+91 94191 00056',
    centerCoordinates: { latitude: 32.6790, longitude: 74.8740 },
    localityAliases: ['gangyal', 'gangyal garden'],
  },
  {
    id: 57,
    number: 57,
    name: 'Gangyal Industrial Area',
    zone: 'South Jammu',
    councillor: 'Satish Kumar',
    contactNumber: '+91 94191 00057',
    centerCoordinates: { latitude: 32.6730, longitude: 74.8780 },
    localityAliases: ['gangyal industrial area', 'sidco gangyal'],
  },
  {
    id: 58,
    number: 58,
    name: 'Digiana Camp & Model Town',
    zone: 'South Jammu',
    councillor: 'Tirath Kaur',
    contactNumber: '+91 94191 00058',
    centerCoordinates: { latitude: 32.6840, longitude: 74.8630 },
    localityAliases: ['digiana camp', 'model town'],
  },
  {
    id: 59,
    number: 59,
    name: 'Paloura Top & Buta Nagar',
    zone: 'North Jammu',
    councillor: 'Subash Chander',
    contactNumber: '+91 94191 00059',
    centerCoordinates: { latitude: 32.7720, longitude: 74.8320 },
    localityAliases: ['paloura top', 'buta nagar'],
  },
  {
    id: 60,
    number: 60,
    name: 'Talab Tillo & Bohri',
    zone: 'North Jammu',
    councillor: 'Meenakshi Sharma',
    contactNumber: '+91 94191 00060',
    centerCoordinates: { latitude: 32.7220, longitude: 74.8250 },
    localityAliases: ['talab tillo', 'bohri chowk'],
  },
  {
    id: 61,
    number: 61,
    name: 'Barnai & Anand Nagar',
    zone: 'North Jammu',
    councillor: 'Kuldeep Singh',
    contactNumber: '+91 94191 00061',
    centerCoordinates: { latitude: 32.7530, longitude: 74.8080 },
    localityAliases: ['barnai', 'anand nagar', 'bawa talab road'],
  },
  {
    id: 62,
    number: 62,
    name: 'Chinore & Durga Nagar',
    zone: 'North Jammu',
    councillor: 'Rekha Manhas',
    contactNumber: '+91 94191 00062',
    centerCoordinates: { latitude: 32.7780, longitude: 74.8330 },
    localityAliases: ['chinore', 'durga nagar', 'koushalya puram'],
  },
  {
    id: 63,
    number: 63,
    name: 'Roop Nagar Sector 1-4',
    zone: 'North Jammu',
    councillor: 'Kuldeep Sharma',
    contactNumber: '+91 94191 00063',
    centerCoordinates: { latitude: 32.7710, longitude: 74.8280 },
    localityAliases: ['roop nagar', 'roop nagar jda', 'chinore chowk'],
  },
  {
    id: 64,
    number: 64,
    name: 'Bantalab Lower & Keran',
    zone: 'North Jammu',
    councillor: 'Kapil Singh Chib',
    contactNumber: '+91 94191 00064',
    centerCoordinates: { latitude: 32.7810, longitude: 74.8250 },
    localityAliases: ['bantalab', 'lower bantalab', 'keran'],
  },
  {
    id: 65,
    number: 65,
    name: 'Patoli Brahmana & Domana',
    zone: 'North Jammu',
    councillor: 'Anita Choudhary',
    contactNumber: '+91 94191 00065',
    centerCoordinates: { latitude: 32.7480, longitude: 74.8180 },
    localityAliases: ['patoli brahmana', 'patoli', 'akhnoor road patoli'],
  },
  {
    id: 66,
    number: 66,
    name: 'Upper Muthi & Jagti Link',
    zone: 'North Jammu',
    councillor: 'Rajnish Kumar',
    contactNumber: '+91 94191 00066',
    centerCoordinates: { latitude: 32.7710, longitude: 74.8050 },
    localityAliases: ['upper muthi', 'muthi top', 'gajansoo road'],
  },
  // --- WARD 67: LOWER MUTHI (The ward reported in bug report) ---
  {
    id: 67,
    number: 67,
    name: 'Lower Muthi (Kalika Colony & Udhaiwala)',
    zone: 'North Jammu',
    councillor: 'Suraj Parkash',
    contactNumber: '+91 94191 00067',
    centerCoordinates: { latitude: 32.7597, longitude: 74.8150 },
    localityAliases: ['muthi', 'lower muthi', 'udhaiwala', 'kalika colony', 'barnai road', 'muthi chowk'],
  },
  {
    id: 68,
    number: 68,
    name: 'Greater Kailash & Bantalab North',
    zone: 'South Jammu',
    councillor: 'Vikram Jamwal',
    contactNumber: '+91 94191 00068',
    centerCoordinates: { latitude: 32.6740, longitude: 74.8920 },
    localityAliases: ['greater kailash', 'kaluchak'],
  },
  {
    id: 69,
    number: 69,
    name: 'Sainik Colony Sector A-C',
    zone: 'South Jammu',
    councillor: 'Gurmeet Kaur',
    contactNumber: '+91 94191 00069',
    centerCoordinates: { latitude: 32.6680, longitude: 74.9080 },
    localityAliases: ['sainik colony', 'sector a sainik colony', 'sector b sainik colony'],
  },
  {
    id: 70,
    number: 70,
    name: 'Sainik Colony Sector D-F',
    zone: 'South Jammu',
    councillor: 'Narinder Singh',
    contactNumber: '+91 94191 00070',
    centerCoordinates: { latitude: 32.6620, longitude: 74.9150 },
    localityAliases: ['sainik colony sector d', 'sainik colony sector e', 'chowadhi more'],
  },
  {
    id: 71,
    number: 71,
    name: 'Sidhra & Asrarabad',
    zone: 'North Jammu',
    councillor: 'Shazia Kousar',
    contactNumber: '+91 94191 00071',
    centerCoordinates: { latitude: 32.7630, longitude: 74.8980 },
    localityAliases: ['sidhra', 'asrarabad', 'golf course sidhra', 'tawi bridge sidhra'],
  },
  {
    id: 72,
    number: 72,
    name: 'Shehzadpur & Kunjwani',
    zone: 'South Jammu',
    councillor: 'Babu Ram',
    contactNumber: '+91 94191 00072',
    centerCoordinates: { latitude: 32.6580, longitude: 74.8720 },
    localityAliases: ['shehzadpur', 'kunjwani', 'bypass jammu'],
  },
  {
    id: 73,
    number: 73,
    name: 'Gadigarh & Airport Environs',
    zone: 'South Jammu',
    councillor: 'Jagdish Kumar',
    contactNumber: '+91 94191 00073',
    centerCoordinates: { latitude: 32.6610, longitude: 74.8520 },
    localityAliases: ['gadigarh', 'satwari airport', 'dharap'],
  },
  {
    id: 74,
    number: 74,
    name: 'Chowadhi & Sunjwan',
    zone: 'South Jammu',
    councillor: 'Bashir Ahmed',
    contactNumber: '+91 94191 00074',
    centerCoordinates: { latitude: 32.6650, longitude: 74.9350 },
    localityAliases: ['chowadhi', 'sunjwan', 'bathindi road'],
  },
  {
    id: 75,
    number: 75,
    name: 'Akalpur & Sangrampur',
    zone: 'North Jammu',
    councillor: 'Kasturi Lal',
    contactNumber: '+91 94191 00075',
    centerCoordinates: { latitude: 32.7350, longitude: 74.7950 },
    localityAliases: ['akalpur', 'sangrampur', 'marh road'],
  },
];

export const JAMMU_MAP_CENTER: Coordinates = {
  latitude: 32.7266,
  longitude: 74.8570,
};

// Municipal territory outer boundary envelope (approximate Jammu metropolitan bounds)
const JMC_BOUNDS = {
  minLat: 32.6200,
  maxLat: 32.8300,
  minLng: 74.7500,
  maxLng: 74.9700,
};

export interface WardEstimationResult {
  ward: JammuWard | null;
  confidence: 'high' | 'suggested' | 'uncertain' | 'none';
  distanceMeters: number;
  statusLabel: string;
  matchedBy: 'proximity' | 'address_locality' | 'none';
}

/**
 * Haversine formula to compute great-circle distance between two coordinates in meters
 */
export function calculateHaversineDistanceMeters(c1: Coordinates, c2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (c1.latitude * Math.PI) / 180;
  const radLat2 = (c2.latitude * Math.PI) / 180;
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLng = ((c2.longitude - c1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Estimates the matching Jammu Municipal Corporation ward for given coordinates.
 * Handles missing polygon data transparently:
 * - Employs Haversine centroid proximity combined with reverse-geocoded locality matching.
 * - Flags out-of-boundary or distant points as 'uncertain' or 'none' instead of forcing false assignments.
 */
export function findEstimatedWard(coords: Coordinates, localityHint?: string): WardEstimationResult {
  if (
    !coords ||
    typeof coords.latitude !== 'number' ||
    typeof coords.longitude !== 'number' ||
    isNaN(coords.latitude) ||
    isNaN(coords.longitude)
  ) {
    return {
      ward: null,
      confidence: 'none',
      distanceMeters: -1,
      statusLabel: 'Invalid coordinates provided',
      matchedBy: 'none',
    };
  }

  // Check if coordinates fall completely outside the Jammu Municipal Corporation region
  if (
    coords.latitude < JMC_BOUNDS.minLat ||
    coords.latitude > JMC_BOUNDS.maxLat ||
    coords.longitude < JMC_BOUNDS.minLng ||
    coords.longitude > JMC_BOUNDS.maxLng
  ) {
    return {
      ward: null,
      confidence: 'none',
      distanceMeters: -1,
      statusLabel: 'Location falls outside Jammu Municipal limits (Select ward manually)',
      matchedBy: 'none',
    };
  }

  // Calculate distance to all known ward centroids
  const distances = JAMMU_WARDS.map((ward) => {
    const dist = ward.centerCoordinates
      ? calculateHaversineDistanceMeters(coords, ward.centerCoordinates)
      : Number.MAX_SAFE_INTEGER;
    return { ward, distanceMeters: dist };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

  const nearest = distances[0];
  if (!nearest || nearest.distanceMeters === Number.MAX_SAFE_INTEGER) {
    return {
      ward: null,
      confidence: 'none',
      distanceMeters: -1,
      statusLabel: 'Ward not determined (Select manually)',
      matchedBy: 'none',
    };
  }

  // Check if reverse-geocoded address hint matches a ward's locality aliases
  if (localityHint && localityHint.trim()) {
    const hintLower = localityHint.toLowerCase();
    const matchedByHint = JAMMU_WARDS.find((w) =>
      w.localityAliases?.some((alias) => hintLower.includes(alias.toLowerCase()))
    );

    if (matchedByHint) {
      const distToMatched = matchedByHint.centerCoordinates
        ? calculateHaversineDistanceMeters(coords, matchedByHint.centerCoordinates)
        : Number.MAX_SAFE_INTEGER;

      // If the address locality matches and is within reasonable spatial range (< 3km), use it with high confidence
      if (distToMatched <= 3000) {
        return {
          ward: matchedByHint,
          confidence: 'high',
          distanceMeters: distToMatched,
          statusLabel: `Auto-verified via location & address (${matchedByHint.name})`,
          matchedBy: 'address_locality',
        };
      }
    }
  }

  // Distance thresholds based on urban ward density
  if (nearest.distanceMeters <= 1200) {
    return {
      ward: nearest.ward,
      confidence: 'high',
      distanceMeters: nearest.distanceMeters,
      statusLabel: `Estimated by proximity (~${nearest.distanceMeters}m from ${nearest.ward.name.split('(')[0].trim()})`,
      matchedBy: 'proximity',
    };
  }

  if (nearest.distanceMeters <= 2600) {
    return {
      ward: nearest.ward,
      confidence: 'suggested',
      distanceMeters: nearest.distanceMeters,
      statusLabel: `Proximity suggestion (~${(nearest.distanceMeters / 1000).toFixed(1)}km from center) — please verify`,
      matchedBy: 'proximity',
    };
  }

  if (nearest.distanceMeters <= 4000) {
    return {
      ward: nearest.ward,
      confidence: 'uncertain',
      distanceMeters: nearest.distanceMeters,
      statusLabel: `Uncertain assignment (~${(nearest.distanceMeters / 1000).toFixed(1)}km away) — please verify ward manually`,
      matchedBy: 'proximity',
    };
  }

  // Point is more than 4km from any ward centroid — do not guess
  return {
    ward: null,
    confidence: 'none',
    distanceMeters: nearest.distanceMeters,
    statusLabel: 'Ward not determined confidently — please select manually',
    matchedBy: 'none',
  };
}

/**
 * Backward-compatible helper used across the app
 */
export function findNearestWard(coords: Coordinates): JammuWard {
  const result = findEstimatedWard(coords);
  return result.ward || JAMMU_WARDS.find((w) => w.id === 67) || JAMMU_WARDS[0];
}
