// Daftar statis kota/kabupaten utama per provinsi. Bukan seluruh 514 kab/kota Kemenag:
// kota lain bisa diketik manual di Settings (Aladhan memetakan nama kota ke koordinat).
// Bagian sebelum koma dipakai sebagai parameter `city` ke API.
const RAW: Record<string, string> = {
  Aceh: 'Banda Aceh|Sabang|Lhokseumawe|Langsa|Meulaboh|Sigli|Takengon|Calang|Subulussalam|Blangpidie',
  'Sumatera Utara': 'Medan|Binjai|Pematangsiantar|Tebing Tinggi|Tanjungbalai|Sibolga|Padangsidimpuan|Gunungsitoli|Kisaran|Rantau Prapat|Balige|Kabanjahe|Lubuk Pakam|Stabat',
  'Sumatera Barat': 'Padang|Bukittinggi|Payakumbuh|Padang Panjang|Solok|Sawahlunto|Pariaman|Painan|Batusangkar|Lubuk Basung',
  Riau: 'Pekanbaru|Dumai|Bengkalis|Siak Sri Indrapura|Bangkinang|Rengat|Pasir Pengaraian|Tembilahan|Pangkalan Kerinci|Selatpanjang',
  'Kepulauan Riau': 'Batam|Tanjung Pinang|Bintan|Karimun|Natuna|Lingga|Anambas',
  Jambi: 'Jambi|Sungai Penuh|Muara Bungo|Bangko|Kuala Tungkal|Muara Bulian|Sarolangun|Muara Sabak',
  'Sumatera Selatan': 'Palembang|Lubuklinggau|Prabumulih|Pagar Alam|Baturaja|Lahat|Sekayu|Kayu Agung|Indralaya|Muara Enim',
  'Bangka Belitung': 'Pangkal Pinang|Sungailiat|Tanjung Pandan|Mentok|Koba|Manggar',
  Bengkulu: 'Bengkulu|Curup|Manna|Arga Makmur|Mukomuko',
  Lampung: 'Bandar Lampung|Metro|Kotabumi|Liwa|Kalianda|Pringsewu|Gunung Sugih|Menggala|Blambangan Umpu|Krui',
  Banten: 'Serang|Cilegon|Tangerang|Tangerang Selatan|Pandeglang|Rangkasbitung',
  'DKI Jakarta': 'Jakarta',
  'Jawa Barat': 'Bandung|Bekasi|Bogor|Depok|Cimahi|Cirebon|Sukabumi|Tasikmalaya|Banjar|Garut|Cianjur|Subang|Karawang|Purwakarta|Indramayu|Majalengka|Kuningan|Sumedang|Ciamis|Pangandaran|Soreang|Ngamprah',
  'Jawa Tengah': 'Jepara, Mlonggo|Jepara|Semarang|Surakarta|Salatiga|Magelang|Pekalongan|Tegal|Kudus|Demak|Pati|Rembang|Blora|Purwodadi|Kendal|Batang|Pemalang|Brebes|Slawi|Purwokerto|Cilacap|Purbalingga|Banjarnegara|Wonosobo|Temanggung|Boyolali|Klaten|Sukoharjo|Wonogiri|Karanganyar|Sragen|Kebumen|Purworejo|Ungaran',
  'DI Yogyakarta': 'Yogyakarta|Sleman|Bantul|Wates|Wonosari',
  'Jawa Timur': 'Surabaya|Malang|Batu|Kediri|Blitar|Madiun|Mojokerto|Pasuruan|Probolinggo|Sidoarjo|Gresik|Jombang|Lamongan|Tuban|Bojonegoro|Ngawi|Magetan|Ponorogo|Pacitan|Trenggalek|Tulungagung|Nganjuk|Lumajang|Jember|Banyuwangi|Bondowoso|Situbondo|Bangkalan|Sampang|Pamekasan|Sumenep',
  Bali: 'Denpasar|Singaraja|Gianyar|Tabanan|Klungkung|Negara|Amlapura|Badung',
  'Nusa Tenggara Barat': 'Mataram|Bima|Dompu|Praya|Selong|Sumbawa Besar|Taliwang|Giri Menang',
  'Nusa Tenggara Timur': 'Kupang|Ende|Maumere|Ruteng|Labuan Bajo|Waingapu|Atambua|Kefamenanu|Soe|Larantuka|Bajawa|Waikabubak',
  'Kalimantan Barat': 'Pontianak|Singkawang|Ketapang|Sintang|Sambas|Putussibau|Sanggau|Mempawah',
  'Kalimantan Tengah': 'Palangka Raya|Sampit|Pangkalan Bun|Kuala Kapuas|Buntok|Muara Teweh|Kasongan',
  'Kalimantan Selatan': 'Banjarmasin|Banjarbaru|Martapura|Barabai|Kandangan|Amuntai|Tanjung|Pelaihari|Kotabaru',
  'Kalimantan Timur': 'Samarinda|Balikpapan|Bontang|Tenggarong|Sangatta|Tanah Grogot|Penajam|Sendawar',
  'Kalimantan Utara': 'Tarakan|Tanjung Selor|Nunukan|Malinau',
  'Sulawesi Utara': 'Manado|Bitung|Tomohon|Kotamobagu|Tondano|Airmadidi',
  Gorontalo: 'Gorontalo|Limboto|Marisa|Kwandang',
  'Sulawesi Tengah': 'Palu|Poso|Luwuk|Toli-Toli|Donggala|Parigi|Buol',
  'Sulawesi Barat': 'Mamuju|Majene|Polewali|Mamasa',
  'Sulawesi Selatan': 'Makassar|Parepare|Palopo|Maros|Gowa|Bulukumba|Bantaeng|Jeneponto|Takalar|Sinjai|Watampone|Soppeng|Sidenreng|Pinrang|Enrekang|Makale|Masamba',
  'Sulawesi Tenggara': 'Kendari|Baubau|Kolaka|Raha|Unaaha|Andoolo|Wangi-Wangi',
  Maluku: 'Ambon|Tual|Masohi|Namlea|Dobo|Saumlaki',
  'Maluku Utara': 'Ternate|Tidore|Sofifi|Jailolo|Tobelo|Labuha',
  'Papua Barat': 'Manokwari|Sorong|Fakfak|Kaimana|Bintuni',
  Papua: 'Jayapura|Merauke|Biak|Nabire|Timika|Wamena|Sentani|Serui',
};

export const CITIES: string[] = Array.from(new Set(Object.values(RAW).flatMap((s) => s.split('|')))).sort((a, b) =>
  a.localeCompare(b, 'id')
);
