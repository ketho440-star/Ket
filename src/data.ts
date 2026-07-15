import { RegionDetail, EcoActivity } from "./types";

export const REGIONS: RegionDetail[] = [
  {
    id: "thailand",
    name: "ภูเก็ต-กระบี่",
    country: "Thailand",
    localProvinces: "ภูเก็ต, กระบี่, พังงา, ตรัง, สตูล",
    description: "ศูนย์กลางการท่องเที่ยวระดับโลกที่มีเครือข่ายกลุ่มประมงพื้นบ้านและผู้ประกอบการร่วมกู้ชีพแนวปะการังและรณรงค์ลดพลาสติกแบบใช้ครั้งเดียวทิ้งในหมู่เกาะท่องเที่ยว",
    stats: {
      cleanups: 145,
      plasticKg: 5200,
      members: 1250
    },
    activeProjects: [
      "โครงการติดตั้งถังรับขยะคืนเหรียญอัจฉริยะ (RVM) รอบเกาะภูเก็ต",
      "ระบบกู้คืนเศษอวนจมโดยกลุ่มนักดำน้ำจิตอาสาพังงาและกระบี่",
      "การเลิกใช้พลาสติก 100% บนเกาะท่องเที่ยว เช่น เกาะพีพีและเกาะห้อง"
    ]
  },
  {
    id: "myanmar",
    name: "หมู่เกาะมะริด (Mergui)",
    country: "Myanmar",
    localProvinces: "มะริด (Myeik), เกาะสอง (Kawthaung)",
    description: "เขตพื้นที่ธรรมชาติที่ยังคงความอุดมสมบูรณ์สูง มีกลุ่มชาติพันธุ์ชาวเล (Moken) ร่วมปกป้องผืนป่าชายเลนและวิจัยความหลากหลายทางชีวภาพใต้ท้องทะเล",
    stats: {
      cleanups: 48,
      plasticKg: 1800,
      members: 350
    },
    activeProjects: [
      "เครือข่ายปกป้องและปลูกป่าชายเลนข้ามแดนโดยชุมชนชาวเลโมเคน",
      "การสำรวจแนวปะการังและกำจัดเศษอวนปีศาจรอบหมู่เกาะมะริดตอนใต้"
    ]
  },
  {
    id: "malaysia",
    name: "ลังกาวี-ปีนัง",
    country: "Malaysia",
    localProvinces: "Langkawi, Penang, Kedah",
    description: "ความร่วมมือด้านอุทยานธรณีสากล (UNESCO Geopark) มุ่งพัฒนาเทคโนโลยีรีไซเคิลชุมชนและการจัดการขยะน้ำเสียจากเรือยอชท์และเรือประมงพาณิชย์",
    stats: {
      cleanups: 85,
      plasticKg: 3100,
      members: 680
    },
    activeProjects: [
      "โครงการท่าเรือสีเขียว (Green Ports) และระบบดักจับขยะในแม่น้ำลังกาวี",
      "การจัดการบรรจุภัณฑ์สิ่งแวดล้อมเพื่อร้านค้าคาเฟ่ชุมชนชายฝั่งปีนัง"
    ]
  },
  {
    id: "india",
    name: "หมู่เกาะอันดามันและนิโคบาร์",
    country: "India",
    localProvinces: "Port Blair, Havelock Island, Neil Island",
    description: "ชายแดนตะวันตกของทะเลอันดามันที่โดดเด่นด้วยเขตอนุรักษ์พะยูนและสัตว์ทะเลหายาก เน้นกิจกรรมรณรงค์คัดแยกขยะต้นทางร่วมกับกลุ่มเยาวชนท้องถิ่น",
    stats: {
      cleanups: 55,
      plasticKg: 1990,
      members: 480
    },
    activeProjects: [
      "ศูนย์เรียนรู้เขตอนุรักษ์พะยูนและเต่าทะเลร่วมกับชาวเกาะ Havelock",
      "การรณรงค์คัดแยกขยะพลาสติกจากนักท่องเที่ยวข้ามฝั่งแผ่นดินใหญ่"
    ]
  },
  {
    id: "indonesia",
    name: "อาเจะห์-สุมาตราเหนือ",
    country: "Indonesia",
    localProvinces: "Aceh, Sabang, North Sumatra",
    description: "เครือข่ายความร่วมมือตอนใต้สุดของทางเข้าทะเลอันดามัน โดดเด่นด้วยเขตอนุรักษ์ปะการังน้ำลึกและระบบนิเวศเกาะภูเขาไฟ มีการส่งเสริมวิถีประมงดั้งเดิมที่ไม่ทำลายสิ่งแวดล้อม",
    stats: {
      cleanups: 74,
      plasticKg: 2800,
      members: 530
    },
    activeProjects: [
      "โครงการฟื้นฟูแนวปะการังเกาะวี (Weh Island) ร่วมกับชุมชนประมงอาเจะห์",
      "การบริหารจัดการแพขยะพลาสติกบริเวณช่องแคบมะละกาตอนเหนือ"
    ]
  },
  {
    id: "maldives",
    name: "มาเล-อะทอลล์เหนือ",
    country: "Maldives",
    localProvinces: "Malé, North Malé Atoll, Ari Atoll",
    description: "หมู่เกาะปะการังที่มีความสูงเฉลี่ยใกล้ระดับน้ำทะเลที่สุด ร่วมแชร์โมเดลการท่องเที่ยวคาร์บอนต่ำ การทำความสะอาดแนวปะการังและการเก็บกู้ตาข่ายผี (Ghost Nets) ข้ามมหาสมุทร",
    stats: {
      cleanups: 92,
      plasticKg: 3400,
      members: 610
    },
    activeProjects: [
      "แคมเปญกู้ภัยแนวปะการังจากตาข่ายผีลอยน้ำ (Olive Ridley Project Co-op)",
      "โมเดลรีสอร์ตปลอดพลาสติกแบบใช้ครั้งเดียวและระบบกู้คืนพลังงานจากขยะเกาะ Thilafushi"
    ]
  },
  {
    id: "japan",
    name: "โอกินาวา-เกาะอิชิงากิ",
    country: "Japan",
    localProvinces: "Okinawa, Ishigaki Island, Miyako Island",
    description: "เครือข่ายพันธมิตรจากมหาสมุทรแปซิฟิกตอนเหนือ ร่วมสนับสนุนเทคโนโลยีการตรวจวัดไมโครพลาสติกประสิทธิภาพสูง การรีไซเคิลพลาสติกทางทะเลขั้นสูง และแชร์ความรู้แนวทางการฟื้นฟูปะการังฟอกขาว",
    stats: {
      cleanups: 68,
      plasticKg: 1500,
      members: 390
    },
    activeProjects: [
      "การประยุกต์ใช้ปัญญาประดิษฐ์และเซ็นเซอร์ตรวจวัดแพขยะและไมโครพลาสติกในกระแสน้ำกุโรชิโอะ",
      "ระบบคัดแยกเศษโฟมและแหอวนประมงรีไซเคิลเป็นวัสดุก่อสร้างชุมชนสีเขียว"
    ]
  }
];

export const INITIAL_ACTIVITIES: EcoActivity[] = [
  {
    id: "act-1",
    type: "cleanup",
    region: "thailand",
    date: "2026-07-10",
    description: "กิจกรรมเก็บขยะชายหาดกู้ภัยชายหาดกะรน",
    coinEarned: 55,
    quantityDetails: "รายงานโดยอาสาสมัคร (2 ถุงขยะใหญ่)",
    status: "verified"
  },
  {
    id: "act-2",
    type: "recycling",
    region: "thailand",
    date: "2026-07-09",
    description: "ส่งขวดพลาสติกเข้าระบบตู้อัตโนมัติ RVM หาดป่าตอง",
    coinEarned: 12,
    quantityDetails: "ขวดพลาสติก 6 ใบ",
    status: "verified"
  },
  {
    id: "act-3",
    type: "cleanup",
    region: "myanmar",
    date: "2026-07-08",
    description: "กู้ชีพเศษอวนจมรอบเกาะแฮมิลตัน (Mergui Archipelago)",
    coinEarned: 100,
    quantityDetails: "เก็บกู้ซากอวนประมงหนัก 15 กิโลกรัม",
    status: "verified"
  },
  {
    id: "act-4",
    type: "recycling",
    region: "malaysia",
    date: "2026-07-07",
    description: "ส่งคืนกระป๋องเครื่องดื่มอลูมิเนียม ณ จุดรับคืน ลังกาวี",
    coinEarned: 8,
    quantityDetails: "กระป๋องโลหะ 4 ใบ",
    status: "verified"
  }
];
