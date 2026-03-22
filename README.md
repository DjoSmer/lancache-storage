# Lancache-Storage 
[RU Version](./README_RU.md)

A web storage system for files. It proxies traffic and stores files when needed.
For example, if you have many devices on the same network and want to avoid repeatedly downloading updates, games, or other files from the internet.

You run Lancache-Storage, and it saves files in storage. Other devices will then download from the storage instead.

This is an alternative implementation of the [https://lancache.net](https://lancache.net) project.

### Main problems with Lancache.net:
- By default, it splits files into 1 MB chunks — additional disk load. It cannot be disabled, only increased.
- Nginx cache does not work with 206 headers. This is used for downloading file segments via the Range header.
  As a result, there are issues with such files, and they must be excluded from Lancache.net.
- It’s unclear what is stored in the cache.
- Works via upstream — nginx sends requests to itself.

### Lancache-Storage features:
- Files are stored as-is (without splitting)
- Supports 206 headers
- You can see what is stored in the cache

## How to run:
### DNS server
I recommend using my [Pi-Hole](https://github.com/DjoSmer/pi-hole-with-lancache-docker), where you can manage what to proxy via a web interface.
Follow the link for setup instructions.

If you don’t need management and want it to work out of the box, you can run the DNS server from [Lancache.net](https://lancache.net/docs/containers/dns/)

### Lancache-Storage
- Download:
  - *[docker-compose.yml](./docker-compose.yml)*
  - *[example.env](./example.env)* → rename to **.env**
- Edit **.env** according to your setup
- Run: **docker compose up -d**

### Docker Services
- **storage** — core of the project, checks, downloads, and stores files
- **storage-watch** — monitors storage. Ensures it does not exceed STORAGE_DISK_SIZE and deletes files older than STORAGE_MAX_AGE
- **storage-sync** — analyzes storage and compares database vs actual files.
  If files exist in storage but not in the database, they are added to the database.
  Can be scheduled to run once per month.

## How it works:
A request comes to Nginx. Nginx forwards it to Storage, which checks if the file exists.
- If it exists → returns a 302 header with the file path. Nginx uses it and serves the file from storage.
- If not → returns a 404 header. Nginx downloads the file directly, while Storage downloads and saves it to storage.

## My experience:
- If your lancache server (LC) has a 1G network card — one SSD is enough, since the bottleneck is the network.
- If LC is 10G — one SSD is not enough, multiple are required. I used TrueNAS and 4 SSDs.

### Some theory:
SSD speeds are high, but for servers it’s important to understand the difference between **IOPS** and **throughput (MB/s)**.

**Approximate характеристики:**
- HDD: ~100–300 IOPS, ~100–250 MB/s
- SATA SSD: ~50,000–100,000+ IOPS, ~500–560 MB/s
- NVMe SSD: ~500,000–1,000,000+ IOPS, ~3000+ MB/s

**IOPS (Input/Output Operations Per Second)** — number of read/write operations per second.

### Block size and ZFS (TrueNAS)
Many file systems use a 4 KB block size.
But ZFS (e.g., in TrueNAS) uses the **recordsize** parameter, which defaults to **128 KB**.

This means:
- files are split into blocks **up to 128 KB**
- large files use larger blocks → fewer operations → higher efficiency

Example, 10 MB file:
- at 4 KB → ~2560 blocks
- at 128 KB → ~80 blocks

Large recordsize (128K):
- reduces overhead
- decreases number of operations
- increases throughput for sequential access

---

10G network ≈ **1.25 GB/s**

- **one HDD** → max ~0.2 GB/s → bottleneck
- **one SATA SSD** → ~0.5 GB/s → still not enough for 10G
- only **NVMe** can approach the limit, but it’s expensive and performance drops when the disk is ~80% full (while LC disks may reach 90%)

To utilize a 10G network, people use:
- RAID0 / ZFS stripe (multiple disks)
- RAIDZ / mirror (balance of speed and reliability)

So options:
- 6 × HDD → ~1.2 GB/s (almost saturates 10G), but better 7–8 for headroom
- 4 × SATA SSD → ~2 GB/s — this is what was chosen; data reliability is not critical

---

Supported by WinnerS computer club, Ufa
