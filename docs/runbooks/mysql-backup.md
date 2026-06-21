# MySQL Backup บน Windows

คู่มือนี้ใช้กับสคริปต์ `scripts/windows/backup-mysql-auto.bat` สำหรับ backup MySQL อัตโนมัติเป็นไฟล์ `.sql` เก็บไว้เป็นโฟลเดอร์ตามวันที่ เช่น `C:\backup\mysql\2026-05-23\my_game_store_020000.sql`

วิธีนี้ใช้ `mysqldump` แทนการ copy โฟลเดอร์ `data` ตรง ๆ เพราะ restore ง่ายกว่า และลดโอกาสได้ไฟล์ backup ที่ไม่สมบูรณ์ขณะฐานข้อมูลกำลังทำงานอยู่

## ไฟล์ที่เกี่ยวข้อง

- `scripts/windows/backup-mysql-auto.bat` - สคริปต์ backup หลัก
- `scripts/windows/backup-docker-mysql-auto.bat` - สคริปต์ backup หลักเมื่อใช้ Docker Compose service `app_db`
- `scripts/windows/mysql-backup.defaults.example.cnf` - ตัวอย่างไฟล์ credential สำหรับ MySQL
- `C:\backup\mysql-backup.cnf` - ไฟล์ credential จริงบนเครื่อง ห้าม commit
- `C:\backup\mysql\` - โฟลเดอร์เก็บ backup จริง
- `C:\backup\docker-mysql\` - โฟลเดอร์เก็บ backup จริงจาก Docker

## 1. วิธีใช้

1. สร้างโฟลเดอร์ backup:

```bat
mkdir C:\backup
mkdir C:\backup\mysql
```

2. สร้างไฟล์ credential จริงที่ `C:\backup\mysql-backup.cnf` โดยใช้รูปแบบนี้:

```ini
[client]
user=root
password=your-real-password
host=127.0.0.1
port=3306
```

ถ้า MySQL ไม่มีรหัสผ่าน ให้ลบบรรทัด `password=...` ออก หรือใส่เป็น `password=` ตามที่เครื่องนั้นใช้จริง

ถ้าใช้ XAMPP แล้ว `C:\xampp\mysql\bin\my.ini` ระบุ `port=3310` ให้เปลี่ยน `port=3306` ในไฟล์นี้เป็น:

```ini
port=3310
```

3. เปิดไฟล์ `scripts/windows/backup-mysql-auto.bat` แล้วตรวจค่าด้านบน:

```bat
set "MYSQLDUMP_EXE=C:\xampp\mysql\bin\mysqldump.exe"
set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
set "MYSQL_DEFAULTS_FILE=C:\backup\mysql-backup.cnf"
set "DATABASE_NAME=my_game_store"
set "BACKUP_ROOT=C:\backup\mysql"
set "SECONDARY_BACKUP_ROOT="
set "RETENTION_DAYS=30"
```

ค่าที่มักต้องแก้คือ:

- `MYSQLDUMP_EXE` ถ้า MySQL ไม่ได้อยู่ใน XAMPP
- `MYSQL_EXE` ถ้า path ของ `mysql.exe` ไม่ตรง
- `DATABASE_NAME` ถ้าชื่อ database ไม่ใช่ `my_game_store`
- `BACKUP_ROOT` ถ้าต้องการเก็บไว้ที่อื่น
- `SECONDARY_BACKUP_ROOT` ถ้าต้องการ copy ไปอีก drive เช่น `D:\mysql-backup`
- `RETENTION_DAYS` จำนวนวันที่เก็บ backup ย้อนหลัง

4. ทดสอบ config ก่อน:

```bat
scripts\windows\backup-mysql-auto.bat check
```

5. สั่ง backup แบบ manual:

```bat
scripts\windows\backup-mysql-auto.bat
```

เมื่อสำเร็จจะได้ไฟล์ประมาณนี้:

```text
C:\backup\mysql\2026-05-23\my_game_store_020000.sql
C:\backup\mysql\2026-05-23\backup_020000.log
C:\backup\mysql\latest.txt
```

6. ตั้ง auto backup ด้วย Task Scheduler:

- เปิด Start Menu แล้วค้นหา `Task Scheduler`
- เลือก `Create Task...`
- แท็บ `General`: ตั้งชื่อเช่น `MySQL Daily Backup`
- แท็บ `Triggers`: เลือก `Daily` เวลาใช้งานน้อย เช่น `02:00`
- แท็บ `Actions`: เลือก `Start a program`
- Program/script:

```text
cmd.exe
```

- Add arguments:

```text
/c "C:\Users\USER\my-game-store\scripts\windows\backup-mysql-auto.bat"
```

- Start in:

```text
C:\Users\USER\my-game-store
```

## ใช้ผ่าน Docker Compose

ถ้าฐานข้อมูลหลักอยู่ใน Docker service `app_db` ให้ใช้สคริปต์นี้แทน:

```bat
scripts\windows\backup-docker-mysql-auto.bat check
scripts\windows\backup-docker-mysql-auto.bat
```

สคริปต์นี้อ่าน `MYSQL_USER` และ `MYSQL_PASSWORD` จาก environment ของ container โดยไม่พิมพ์รหัสผ่านออกหน้าจอ แล้วใช้ `mysqldump` ภายใน container โดยตรง

สคริปต์ Docker ใช้ `--no-tablespaces` และไม่ dump MySQL events เพื่อให้ backup ด้วย user ของแอปได้โดยไม่ต้องใช้ root

ค่าเริ่มต้น:

```bat
set "COMPOSE_SERVICE=app_db"
set "DATABASE_NAME=my_game_store"
set "BACKUP_ROOT=C:\backup\docker-mysql"
set "RETENTION_DAYS=30"
```

เมื่อสำเร็จจะได้ไฟล์ประมาณนี้:

```text
C:\backup\docker-mysql\2026-05-24\my_game_store_020000.sql
C:\backup\docker-mysql\2026-05-24\backup_020000.log
C:\backup\docker-mysql\latest.txt
```

ตั้ง Task Scheduler สำหรับ Docker:

```text
Program/script: cmd.exe
Arguments: /c "C:\Users\USER\my-game-store\scripts\windows\backup-docker-mysql-auto.bat"
Start in: C:\Users\USER\my-game-store
```

ข้อสำคัญ: Docker Desktop และ service `app_db` ต้องรันอยู่ก่อนถึงเวลา backup ถ้ายังไม่รัน ให้เปิดด้วย:

```bat
scripts\windows\start-web.bat
```

## 2. วิธีตรวจสอบ

ตรวจ config และการเชื่อมต่อ MySQL:

```bat
scripts\windows\backup-mysql-auto.bat check
```

ถ้าใช้ Docker:

```bat
scripts\windows\backup-docker-mysql-auto.bat check
```

ตรวจว่า backup ถูกสร้างจริง:

```bat
dir C:\backup\mysql
type C:\backup\mysql\latest.txt
```

เปิดไฟล์ log ของวันที่ล่าสุด เช่น:

```bat
type C:\backup\mysql\2026-05-23\backup_020000.log
```

ตรวจขนาดไฟล์ `.sql`:

```bat
dir C:\backup\mysql\2026-05-23\*.sql
```

ถ้าไฟล์มีขนาด `0 bytes` หรือไม่มีไฟล์ `.sql` แปลว่า backup ไม่สมบูรณ์ ให้ดู log ทันที

ตรวจว่าไฟล์ SQL อ่านได้:

```bat
findstr /i /c:"CREATE TABLE" /c:"INSERT INTO" C:\backup\mysql\2026-05-23\my_game_store_020000.sql
```

ทดสอบ restore ลง database ทดสอบ ไม่ควร restore ทับ database จริงทันที:

```bat
C:\xampp\mysql\bin\mysql.exe --defaults-extra-file=C:\backup\mysql-backup.cnf -e "CREATE DATABASE my_game_store_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
C:\xampp\mysql\bin\mysql.exe --defaults-extra-file=C:\backup\mysql-backup.cnf my_game_store_restore_test < C:\backup\mysql\2026-05-23\my_game_store_020000.sql
C:\xampp\mysql\bin\mysql.exe --defaults-extra-file=C:\backup\mysql-backup.cnf -e "SHOW TABLES FROM my_game_store_restore_test;"
```

เมื่อตรวจเสร็จแล้วค่อยลบ database ทดสอบ:

```bat
C:\xampp\mysql\bin\mysql.exe --defaults-extra-file=C:\backup\mysql-backup.cnf -e "DROP DATABASE my_game_store_restore_test;"
```

## ข้อควรจำ

- อย่าใส่รหัสผ่าน MySQL จริงลงใน `.bat`
- อย่า commit ไฟล์ `.sql` เพราะมีข้อมูลจริงของลูกค้าและระบบ
- ควรมี backup อีกชุดใน drive อื่นหรือ cloud storage
- ควรทดสอบ restore อย่างน้อยเดือนละครั้ง
- ถ้าใช้ตารางที่ไม่ใช่ InnoDB อาจต้องวางแผนช่วงเวลาที่ระบบใช้งานน้อยเป็นพิเศษ
