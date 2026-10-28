# ONE MORE DAY — ภาพยนตร์แอนิเมชันฉบับเต็ม (16:9)

ดัดแปลงจากนิยาย **"ONE MORE DAY แค่วันเดียวกับเธอ"** และ **"ONE MORE DAY 2 ขออีกหนึ่งวันกับเธอ"**
ของ ภูมินริศร์ โชติพงศ์ (Sawasdeekap) — ทำเป็นหนังสองภาค เล่าครบตั้งแต่ต้นจนจบทั้งสองเล่ม

* ภาพ: วาดด้วยโค้ดทั้งหมดบน `<canvas>` 1920×1080, 24fps, letterbox 2.39:1, ระยะชัดลึก, แสงตามเวลาของวัน, เกรนฟิล์ม
* เสียงพากย์: AI ภาษาไทยแบบออฟไลน์ (Meta MMS-TTS ผ่าน sherpa-onnx) แต่ละตัวละครปรับโทน/ฟอร์แมนต์และเสียงห้องต่างกัน
  ทุกประโยคถูกตรวจการออกเสียงด้วย Whisper (ASR) — สร้างหลายเทค แล้วเลือกเทคที่ Whisper ฟังแล้วตรงบทที่สุด
* ดนตรีประกอบ / เสียงบรรยากาศ / เอฟเฟกต์: สังเคราะห์ใน Python (numpy/scipy) ไม่มีไฟล์เสียงจากภายนอก

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `screenplay/part1.omd`, `part2.omd` | บทภาพยนตร์ (ฉาก, ตำแหน่งตัวละคร, บทพูด, คำอ่านสำหรับ TTS ใน `{...}`, การกระทำ) |
| `tools/screenplay.py` | แปลงบท `.omd` → JSON |
| `tools/voice.py` | สร้างเสียงพากย์ + ตรวจการออกเสียง (รอบแรก) |
| `tools/improve.py` | รอบสองสำหรับประโยคที่ออกเสียงผิด (พูดต่อท้ายประโยคนำแล้วตัดออก) |
| `tools/timeline.py` | จัดเวลาทุกประโยค/ช็อต → `build/partN.timeline.js` |
| `tools/score.py` | เพลง เสียงบรรยากาศ ปรับเสียงตัวละคร มิกซ์ → `build/partN.m4a` |
| `tools/render.js` | เรนเดอร์ภาพจาก `movie.html` (หลาย worker) + รวมเสียง → MP4 |
| `engine/*.js` | ตัวละคร, ฉาก, กล้อง/การกำกับ, เอฟเฟกต์ |

## สร้างหนังใหม่ทั้งเรื่อง

```bash
python -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
# โมเดล (จาก GitHub releases ของ k2-fsa/sherpa-onnx) วางไว้ที่ tools/model/
#   vits-mms-tha/                (tts-models/vits-mms-tha.tar.bz2)
#   sherpa-onnx-whisper-small/   (asr-models/sherpa-onnx-whisper-small.tar.bz2)
for n in 1 2; do
  .venv/bin/python tools/screenplay.py screenplay/part$n.omd build/part$n.json
  .venv/bin/python tools/voice.py   build/part$n.json
  .venv/bin/python tools/improve.py build/part$n.json
  .venv/bin/python tools/timeline.py build/part$n.json build/part$n.timeline.js
  .venv/bin/python tools/score.py $n
  node tools/render.js $n build/one-more-day-part$n.mp4 3     # ต้องมี playwright + ffmpeg
done
```

ดูแบบเล่นสดในเบราว์เซอร์ได้ที่ `movie.html?part=1` (หลังสร้าง `build/` แล้ว)

## แก้คำอ่านผิด

ดูรายงาน `build/voice/report_partN.json` (ค่า `cer` > 0.35 คือควรตรวจ) แล้วเขียนคำอ่านในบท เช่น

```
film: กล้องโทรทรรศน์ของชมรม {กล้องโทระทัด ของชมรม}
```

หรือเพิ่มคำใน `LEXICON` ของ `tools/voice.py` แล้วรัน voice/improve/timeline/score ใหม่ (เฉพาะประโยคที่เปลี่ยนจะถูกสร้างใหม่)
