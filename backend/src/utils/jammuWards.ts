export interface BackendJammuWard {
  id: number;
  number: number;
  name: string;
  zone: 'South Jammu' | 'North Jammu' | 'Old City' | 'Bahu';
}

/**
 * Static reference roster of Jammu Municipal Corporation (JMC) administrative wards (1–75).
 */
export const JAMMU_WARDS_MAP: Record<number, BackendJammuWard> = {
  1: { id: 1, number: 1, name: 'Panjtirthi & Old Heritage City', zone: 'Old City' },
  2: { id: 2, number: 2, name: 'Jullaka Mohalla & Kanak Mandi', zone: 'Old City' },
  3: { id: 3, number: 3, name: 'Mast Garh & Peer Mitha', zone: 'Old City' },
  4: { id: 4, number: 4, name: 'Bhabarian & Purani Mandi', zone: 'Old City' },
  5: { id: 5, number: 5, name: 'Talab Khatikhan & Shaheedi Chowk', zone: 'Old City' },
  6: { id: 6, number: 6, name: 'Gujjar Nagar (Tawi Bank)', zone: 'Old City' },
  7: { id: 7, number: 7, name: 'Khatikan Talab & Christian Colony', zone: 'Old City' },
  8: { id: 8, number: 8, name: 'Dogra Hall & Ustad Mohalla', zone: 'Old City' },
  9: { id: 9, number: 9, name: 'Kachi Chawni & CPO Complex', zone: 'Old City' },
  10: { id: 10, number: 10, name: 'Pacca Danga & Moti Bazaar', zone: 'Old City' },
  11: { id: 11, number: 11, name: 'Malhotrian & Chowk Chabutra', zone: 'Old City' },
  12: { id: 12, number: 12, name: 'Krishna Nagar & Science College', zone: 'South Jammu' },
  13: { id: 13, number: 13, name: 'Residency Road & Raghunath Bazaar', zone: 'Old City' },
  14: { id: 14, number: 14, name: 'Bhagwati Nagar & Canal Road', zone: 'South Jammu' },
  15: { id: 15, number: 15, name: 'Prem Nagar & Christian Colony (Canal)', zone: 'South Jammu' },
  16: { id: 16, number: 16, name: 'New Plot & Jawahar Nagar', zone: 'North Jammu' },
  17: { id: 17, number: 17, name: 'Ambphalla & Karan Nagar', zone: 'North Jammu' },
  18: { id: 18, number: 18, name: 'Sarwal Colony (West)', zone: 'North Jammu' },
  19: { id: 19, number: 19, name: 'Bakshi Nagar (Medical College)', zone: 'South Jammu' },
  20: { id: 20, number: 20, name: 'Gandhi Nagar (A-Block & Gol Market)', zone: 'South Jammu' },
  21: { id: 21, number: 21, name: 'Gandhi Nagar (B-Block & Gole Market East)', zone: 'South Jammu' },
  22: { id: 22, number: 22, name: 'Shastri Nagar (Central)', zone: 'South Jammu' },
  23: { id: 23, number: 23, name: 'Nai Basti & Rampura', zone: 'South Jammu' },
  24: { id: 24, number: 24, name: 'Rehari Colony (South)', zone: 'North Jammu' },
  25: { id: 25, number: 25, name: 'Rehari Mohalla & Subhash Nagar Border', zone: 'North Jammu' },
  26: { id: 26, number: 26, name: 'Subhash Nagar (East)', zone: 'North Jammu' },
  27: { id: 27, number: 27, name: 'Bakshi Nagar (Gurudwara Road)', zone: 'South Jammu' },
  28: { id: 28, number: 28, name: 'Bakshi Nagar (Parihar Mohalla)', zone: 'South Jammu' },
  29: { id: 29, number: 29, name: 'Rajpura Mangotrian (Main)', zone: 'South Jammu' },
  30: { id: 30, number: 30, name: 'Talab Tillo (Camp Road)', zone: 'South Jammu' },
  31: { id: 31, number: 31, name: 'Talab Tillo (Gole Gujral Road)', zone: 'South Jammu' },
  32: { id: 32, number: 32, name: 'Gole Pull & Talab Tillo Chowk', zone: 'South Jammu' },
  33: { id: 33, number: 33, name: 'Shiv Nagar & Shakti Nagar (East)', zone: 'South Jammu' },
  34: { id: 34, number: 34, name: 'Janipur (Old Colony & Housing Board)', zone: 'North Jammu' },
  35: { id: 35, number: 35, name: 'Janipur (Main Bazaar & High Court Road)', zone: 'North Jammu' },
  36: { id: 36, number: 36, name: 'Janipur (Patoli Brahmana Road)', zone: 'North Jammu' },
  37: { id: 37, number: 37, name: 'Patoli Mangotrian (North)', zone: 'North Jammu' },
  38: { id: 38, number: 38, name: 'Paloura (Brahmana & Domana Road)', zone: 'North Jammu' },
  39: { id: 39, number: 39, name: 'Top Sherkhania (Subash Nagar Extension)', zone: 'North Jammu' },
  40: { id: 40, number: 40, name: 'Sarwal (Main Colony & Hospital Road)', zone: 'North Jammu' },
  41: { id: 41, number: 41, name: 'Vikas Nagar & Patoli Morh', zone: 'North Jammu' },
  42: { id: 42, number: 42, name: 'Nanak Nagar (Sector 1, 2, 3)', zone: 'South Jammu' },
  43: { id: 43, number: 43, name: 'Nanak Nagar (Sector 4, 5, 6)', zone: 'South Jammu' },
  44: { id: 44, number: 44, name: 'Nanak Nagar (Sector 7, 8, 9 & Gurudwara)', zone: 'South Jammu' },
  45: { id: 45, number: 45, name: 'Nanak Nagar (Sector 10, 11, 12)', zone: 'South Jammu' },
  46: { id: 46, number: 46, name: 'Digiana (Camp & Dashmesh Nagar)', zone: 'South Jammu' },
  47: { id: 47, number: 47, name: 'Bahu Fort (Heritage Shrine Zone)', zone: 'Bahu' },
  48: { id: 48, number: 48, name: 'Sheikh Nagar & Gorkha Nagar', zone: 'Bahu' },
  49: { id: 49, number: 49, name: 'Channi Himmat (Sector 1 & 2)', zone: 'South Jammu' },
  50: { id: 50, number: 50, name: 'Channi Himmat (Sector 3 & 4)', zone: 'South Jammu' },
  51: { id: 51, number: 51, name: 'Channi Himmat (Sector 5, 6, 7)', zone: 'South Jammu' },
  52: { id: 52, number: 52, name: 'Channi Rama & Malik Market', zone: 'South Jammu' },
  53: { id: 53, number: 53, name: 'Trikuta Nagar (Sector 1, 1A, 2)', zone: 'South Jammu' },
  54: { id: 54, number: 54, name: 'Trikuta Nagar (Sector 3, 4, 5)', zone: 'South Jammu' },
  55: { id: 55, number: 55, name: 'Trikuta Nagar (Sector 6, 7, 8 & Railway)', zone: 'South Jammu' },
  56: { id: 56, number: 56, name: 'Gangyal (Garden & Commercial Area)', zone: 'South Jammu' },
  57: { id: 57, number: 57, name: 'Gangyal (Industrial Complex Zone)', zone: 'South Jammu' },
  58: { id: 58, number: 58, name: 'Digiana (Ashram & Model Town)', zone: 'South Jammu' },
  59: { id: 59, number: 59, name: 'Bahu (Qasim Nagar & Rajiv Nagar)', zone: 'Bahu' },
  60: { id: 60, number: 60, name: 'Paloura (Muthi Road & BSF HQ)', zone: 'North Jammu' },
  61: { id: 61, number: 61, name: 'Barnai & Bantalab Road', zone: 'North Jammu' },
  62: { id: 62, number: 62, name: 'Chinnore & Durga Nagar', zone: 'North Jammu' },
  63: { id: 63, number: 63, name: 'Roop Nagar (Housing Colony & Sector 1-3)', zone: 'North Jammu' },
  64: { id: 64, number: 64, name: 'Bantalab (Main Chowk & Keran Road)', zone: 'North Jammu' },
  65: { id: 65, number: 65, name: 'Muthi (Main Village & Camp Road)', zone: 'North Jammu' },
  66: { id: 66, number: 66, name: 'Muthi (Migrant Quarters & Lower Muthi)', zone: 'North Jammu' },
  67: { id: 67, number: 67, name: 'Muthi (Upper & Directorate of Agriculture)', zone: 'North Jammu' },
  68: { id: 68, number: 68, name: 'Greater Kailash (Main & Lane 1-15)', zone: 'South Jammu' },
  69: { id: 69, number: 69, name: 'Sainik Colony (Sector A, B, C)', zone: 'South Jammu' },
  70: { id: 70, number: 70, name: 'Sainik Colony (Sector D, E, F & Chowadi Road)', zone: 'South Jammu' },
  71: { id: 71, number: 71, name: 'Sidhra & Golf Course Road', zone: 'Bahu' },
  72: { id: 72, number: 72, name: 'Asrarabad & Sidhra Bridge', zone: 'Bahu' },
  73: { id: 73, number: 73, name: 'Sunjwan (Bathindi Road)', zone: 'Bahu' },
  74: { id: 74, number: 74, name: 'Bathindi (Upper & Sunjwan Chowk)', zone: 'Bahu' },
  75: { id: 75, number: 75, name: 'Sunjwan (Military Station Enclave & Chowadi)', zone: 'Bahu' },
};

export function getJammuWard(wardNumber: number): BackendJammuWard {
  const ward = JAMMU_WARDS_MAP[wardNumber];
  if (!ward) {
    return {
      id: wardNumber,
      number: wardNumber,
      name: `Ward ${wardNumber}`,
      zone: 'South Jammu',
    };
  }
  return ward;
}
