// Detailed notes: concept id (or "term:<Term>") -> { body, example, tip }.
// Modules: Computer Storage & CPU, OS Boot & File Systems, Binary & OS Internals,
// IT Project & Data Analytics, Python for Automation, Database Fundamentals.
const n = (body, example, tip) => ({ body, example, tip });

export default {
  // ---------- Computer Storage & CPU ----------
  'm2-1': n(
    "Hardware is every physical component you can touch: the CPU, memory, storage drives, motherboard, power supply, cables, and peripherals such as keyboards and monitors. Software is the set of coded instructions that tells that hardware what to do. On its own, hardware is inert metal and silicon; software without hardware has nowhere to run.\n\nSoftware splits into two broad layers. System software (the operating system, device drivers, and firmware) manages the hardware and provides services. Application software (browsers, office suites, games, security tools) runs on top of the system layer to do work for the user. Firmware sits in between: software permanently stored on a chip, such as the BIOS/UEFI or the code inside an SSD controller.",
    "When a new printer does not work, the hardware may be fine but the driver (system software) is missing. Installing the driver fixes it without touching the device.",
    "Troubleshoot in layers: rule out hardware (power, cables, lights) before software (drivers, OS, apps). CompTIA exams love asking which layer a symptom belongs to."
  ),
  'm2-2': n(
    "Computers come in many sizes, but they all follow the same input-process-output model. Embedded systems are small dedicated computers inside other products (routers, cars, smart thermostats) that run one job with very little memory. Personal computers (desktops and laptops) serve a single user at a time. Mobile devices trade raw power for battery life.\n\nServers run services for many users simultaneously and are built for reliability: redundant power, ECC memory, and remote management. Mainframes process enormous transaction volumes with extreme uptime, which is why banks, airlines, and governments still rely on them. Supercomputers link thousands of processors to tackle a single huge calculation such as climate modelling or genome analysis.",
    "Your card payment at a shop likely passes through an embedded payment terminal, a bank's server farm, and ultimately a mainframe that settles the transaction.",
    "Match the computer to its workload: many users and uptime = server; massive transaction throughput = mainframe; one massive calculation = supercomputer."
  ),
  'm2-3': n(
    "Every computing task follows the same cycle: take input, process it, produce output, and optionally store the result. Input devices feed data in: keyboards, mice, touchscreens, microphones, scanners, sensors, and network interfaces. The CPU, working with RAM, transforms that data by following program instructions.\n\nOutput devices present the result: monitors, printers, speakers, or data sent across a network. Storage devices (SSDs, HDDs, cloud) keep information after power is removed so it can be processed again later. Many devices do more than one job: a touchscreen is both input and output, a network card sends and receives, and a disk both reads and writes.",
    "Typing a search: keystrokes (input) are processed by the browser and CPU, results appear on screen (output), and your history is saved to disk (storage).",
    "When a question asks for a device that is both input and output, think touchscreen, network card, or storage drive."
  ),
  'm2-4': n(
    "Ports are the external connectors where devices plug in: USB (and USB-C), HDMI and DisplayPort for video, RJ45 Ethernet for networking, and audio jacks. Different generations of the same port can have very different speeds: USB 2.0 tops out around 480 Mbps while USB 3.2 and USB4 reach many gigabits per second.\n\nBuses are the internal highways that carry data between components on the motherboard. PCI Express (PCIe) connects graphics cards, NVMe SSDs, and network cards using lanes (x1, x4, x16); more lanes and newer generations mean more bandwidth. SATA connects older drives and is limited to about 6 Gbps, which is why NVMe drives on PCIe are several times faster than SATA SSDs.",
    "Plugging a fast external SSD into a USB 2.0 port makes it crawl. The drive is fine; the port is the bottleneck.",
    "Performance is set by the slowest link. Check the port or bus generation before blaming the device."
  ),
  'm2-5': n(
    "A bit is a single binary digit, 0 or 1, and a byte is 8 bits. Larger units scale up: kilobyte, megabyte, gigabyte, terabyte, and petabyte. In the binary convention each step is 1024 times the previous one (2^10); in the decimal convention used by drive makers and networking each step is 1000.\n\nTo remove the ambiguity, the IEC defined binary prefixes: KiB, MiB, GiB, TiB. So 1 TB (decimal) is 1,000,000,000,000 bytes, while 1 TiB is 1,099,511,627,776 bytes. That gap is why a new \"1 TB\" drive shows about 931 GB in Windows, which reports in binary units but labels them GB.",
    "A 500 GB drive shows roughly 465 GB in the OS. Nothing is missing; the two sides are counting with different multipliers.",
    "Network speeds use bits (Mbps) while file sizes use bytes (MB). Divide by 8: a 100 Mbps link moves at most about 12.5 MB per second."
  ),
  'm2-6': n(
    "The memory hierarchy arranges storage from fastest, smallest, and most expensive at the top to slowest, largest, and cheapest at the bottom: CPU registers, L1/L2/L3 cache, RAM, SSD, HDD, and finally tape or cloud archive. Each step down is roughly an order of magnitude slower but far cheaper per gigabyte.\n\nSystems perform well by keeping the data being used right now (hot data) as high in the hierarchy as possible and letting cold data sink lower. Caches, RAM sizing, SSD tiering, and archive policies are all applications of this one idea, from a single laptop to a whole cloud storage strategy.",
    "A database server with enough RAM to hold its working set answers queries from memory; one without it hits disk constantly and slows to a crawl.",
    "When asked how to improve performance cheaply, the answer is often to move hot data up a tier: add RAM, add cache, or move to SSD."
  ),
  'm2-7': n(
    "CPU cache is a small amount of extremely fast memory built into the processor. It holds copies of recently or frequently used data and instructions so the CPU does not have to wait for RAM, which is far slower by comparison. Cache is organised in levels: L1 is tiny and fastest and sits inside each core, L2 is larger and slightly slower, and L3 is the largest and is usually shared by all cores.\n\nA cache hit, where the data is already in cache, is served in a few clock cycles. A cache miss forces a trip to RAM that can cost hundreds of cycles. Software that accesses memory in predictable, sequential patterns gets far more hits and runs noticeably faster.",
    "Two CPUs with the same clock speed can perform very differently in games or databases because one has a much larger L3 cache.",
    "Order to remember: registers → L1 → L2 → L3 → RAM. L1 is smallest and fastest."
  ),
  'm2-8': n(
    "RAM (random access memory) is the computer's working memory: it holds the operating system, open programs, and the data they are actively using. It is volatile, meaning its contents disappear when power is lost, which is why unsaved work is lost in a power cut.\n\nRAM is much faster than any disk. When it fills up, the OS starts paging (swapping) less-used data to disk, and performance drops sharply. Capacity, speed (for example DDR4 vs DDR5), and channel configuration all matter. Servers often use ECC RAM, which detects and corrects single-bit memory errors to prevent silent data corruption.",
    "A laptop with 8 GB of RAM slows down with dozens of browser tabs open, then speeds up instantly after closing them. The disk was being used as overflow memory.",
    "Volatile = RAM (lost at power off). Non-volatile = ROM, SSD, HDD. Adding RAM is a classic fix for heavy swapping."
  ),
  'm2-9': n(
    "The CPU (central processing unit) executes program instructions in a continuous cycle: fetch the next instruction from memory, decode what it means, execute it, and write back the result. Billions of these cycles happen every second.\n\nClock speed, measured in GHz, is how many cycles per second the CPU runs, but it is only one factor. Real performance also depends on core count, cache size, instructions per clock (IPC), and thermal limits. Modern CPUs boost their clock when there is thermal headroom and throttle back when they get too hot, so cooling directly affects speed.",
    "A newer 3.5 GHz CPU can outperform an older 4.5 GHz CPU because it completes more work per clock cycle and has a larger cache.",
    "Remember the machine cycle: fetch, decode, execute, store (write back)."
  ),
  'm2-10': n(
    "Inside the CPU, the Control Unit (CU) is the coordinator: it fetches instructions, decodes them, and directs data between parts of the processor. The Arithmetic Logic Unit (ALU) does the actual computation: addition, subtraction, comparisons, and logical operations such as AND, OR, and NOT.\n\nRegisters are a handful of tiny, ultra-fast storage slots that hold the values being worked on this instant, such as the current instruction (instruction register) and the address of the next one (program counter). On-chip cache keeps these units supplied with data. Modern CPUs also include floating-point units, vector units, and sometimes integrated graphics.",
    "When code compares two numbers in an if statement, the ALU performs the comparison while the Control Unit decides which instruction runs next.",
    "CU = directs; ALU = calculates and compares; registers = fastest storage of all."
  ),
  'm2-11': n(
    "A CPU's architecture defines its instruction set: the basic commands it understands. x86-64, used by Intel and AMD, dominates desktops, laptops, and most servers and is built around high performance. ARM uses a simpler, more power-efficient design and dominates phones, tablets, embedded devices, Apple Silicon Macs, and a growing share of cloud servers such as AWS Graviton.\n\nSoftware compiled for one architecture cannot run natively on another. It needs a recompiled version or an emulation layer (such as Apple's Rosetta 2), which costs performance. Beyond architecture, chips are also designed for different roles: server CPUs add many cores and reliability features, mobile chips focus on battery life, and embedded chips are small and cheap.",
    "A cloud team moves workloads to ARM-based instances to cut costs, but must rebuild container images for ARM first.",
    "When a program 'won't install' on a new device, check whether it is built for the right architecture (x86-64 vs ARM64)."
  ),
  'm2-12': n(
    "A core is an independent processing unit inside the CPU, capable of running its own stream of instructions. Dual-core, quad-core, and octa-core chips can genuinely run 2, 4, or 8 tasks at the same instant rather than just switching between them.\n\nSimultaneous multithreading (Intel calls it Hyper-Threading) lets each physical core present itself to the OS as two logical processors. This helps because one thread can use the core while the other waits on memory, but it is not the same as doubling the cores. More cores help only when the software can split its work into parallel pieces.",
    "Video rendering and code compilation scale well across many cores; a single-threaded older game barely benefits from them.",
    "Physical cores do real parallel work; logical (hyper-threaded) cores improve utilisation. Task Manager shows both counts."
  ),
  'm2-13': n(
    "The bit width of a processor determines how large a memory address it can form. A 32-bit CPU can address 2^32 bytes, about 4 GB, which is the hard ceiling for a 32-bit operating system. A 64-bit CPU can theoretically address 2^64 bytes (16 exabytes), although real systems support far less.\n\n64-bit processors also handle larger numbers in a single operation and have more registers, which improves performance. A 64-bit OS can run most 32-bit applications through a compatibility layer (on Windows, programs in 'Program Files (x86)'), but a 32-bit OS cannot run 64-bit software at all.",
    "An old PC with 8 GB of RAM installed but a 32-bit Windows edition only uses about 3.5 GB of it.",
    "More than 4 GB of RAM requires a 64-bit OS. This is a classic A+/Network+ style question."
  ),
  'm2-14': n(
    "Multiprocessing means executing multiple processes or threads truly simultaneously on more than one core or CPU. It is parallelism provided by hardware: two cores can each run a different instruction at the same moment.\n\nThe benefit depends entirely on the workload. Tasks that split into independent pieces, such as encoding video, serving many web requests, or scientific simulations, scale nicely. Work that must happen step by step, where each step depends on the last, cannot be split and gains little. Amdahl's law captures this: the serial part of a program limits the total speed-up.",
    "A web server handling thousands of users benefits hugely from 32 cores; a spreadsheet recalculating one long chain of formulas does not.",
    "Multiprocessing = real simultaneous execution on multiple cores. Multitasking = the OS switching quickly between tasks."
  ),
  'm2-15': n(
    "Multitasking is the operating system's ability to run many programs apparently at once. On a single core, the scheduler gives each task a short time slice and switches between them so fast (a context switch) that they feel simultaneous. On multi-core CPUs, multitasking combines with multiprocessing so some tasks really do run in parallel.\n\nModern OSs use preemptive multitasking: the scheduler can interrupt any task to keep the system responsive. Every context switch has overhead (saving and restoring registers and cache state), so thousands of busy threads can waste CPU time on switching instead of useful work.",
    "Music keeps playing smoothly while you browse and download files, because the scheduler constantly shares CPU time between those processes.",
    "Preemptive multitasking is why one frozen app does not freeze the whole modern OS."
  ),
  'm2-16': n(
    "The motherboard is the main circuit board that everything connects to: the CPU socket, RAM slots, storage connectors (SATA, M.2), PCIe expansion slots, power connectors, and the rear I/O panel. It carries the buses that let those parts communicate.\n\nThe chipset on the motherboard controls which CPUs, memory types and speeds, and expansion options the board supports. Form factor (ATX, micro-ATX, mini-ITX) sets its physical size and how many slots it offers. The board also holds the firmware chip (BIOS/UEFI) and, on many systems, a TPM for hardware-based security.",
    "Upgrading to a new CPU generation often means a new motherboard too, because the socket or chipset no longer matches.",
    "Before any upgrade, check motherboard compatibility first: socket, chipset, RAM type, and available slots."
  ),
  'm2-17': n(
    "A hard disk drive stores data magnetically on spinning platters, read and written by heads on a moving arm. Because the head must physically travel to the right track and wait for the platter to rotate into position, access times are measured in milliseconds, thousands of times slower than RAM.\n\nHDDs remain the cheapest storage per terabyte, so they are still used for bulk storage, backups, NAS devices, and archives. Performance improves with rotational speed (5400, 7200, or 10,000–15,000 RPM in enterprise drives) and cache size. Being mechanical, they are sensitive to shock and wear out over time.",
    "A home NAS uses four large HDDs for cheap capacity, while the laptop uses an SSD for speed.",
    "HDD = cheap capacity, slow random access, fragile. SSD = fast, shock-resistant, more expensive per GB."
  ),
  'm2-18': n(
    "Inside an HDD, one or more platters coated in magnetic material spin on a spindle driven by a motor. An actuator arm moves read/write heads that float a few nanometres above each platter surface on a cushion of air.\n\nEach surface is divided into concentric rings called tracks, and each track into sectors, traditionally 512 bytes and now usually 4 KB (Advanced Format). The same track position across all platters forms a cylinder. Because the head flies so close to the surface, a knock while the drive is spinning can cause a head crash that physically damages the platter and destroys data.",
    "A dropped external hard drive that now makes clicking noises has likely suffered head or actuator damage. Stop using it and send it for recovery if the data matters.",
    "Clicking or grinding sounds = mechanical failure. Power it down immediately; retrying can make recovery impossible."
  ),
  'm2-19': n(
    "Solid state drives store data in NAND flash memory chips with no moving parts, so there is no seek time and random access is extremely fast. SSDs boot systems in seconds, resist drops, run silently, and use less power than HDDs. SATA SSDs are limited by the SATA bus; NVMe SSDs connect over PCIe and are many times faster.\n\nFlash cells wear out after a limited number of write cycles. Controllers use wear levelling to spread writes across all cells, over-provisioning to keep spare blocks, and the TRIM command (sent by the OS) to learn which blocks are no longer in use. Endurance is quoted as TBW (terabytes written) or DWPD (drive writes per day).",
    "Replacing an old laptop's HDD with an SSD is often the single biggest performance upgrade you can make.",
    "Never defragment an SSD. It adds wear and gives no benefit. Securely erasing SSDs needs vendor secure-erase or crypto-erase, not overwriting."
  ),
  'm2-20': n(
    "Before a disk can store files, it must be partitioned and formatted. Partitioning divides one physical disk into separate logical volumes (such as C: and D: on Windows) and records them in a partition table, either MBR or GPT.\n\nFormatting then writes a file system (NTFS, ext4, APFS, FAT32, exFAT) onto a partition, creating the structures the OS uses to track files and free space. Partitioning lets you separate the OS from data, dual-boot different operating systems, or keep a recovery partition. Both operations can destroy existing data if you pick the wrong target.",
    "An IT technician creates a separate data partition so the OS partition can be reinstalled later without wiping user files.",
    "Always double-check the disk number in Disk Management or `lsblk` before partitioning or formatting."
  ),

  // ---------- OS Boot & File Systems ----------
  'm3-1': n(
    "An operating system is the software layer between hardware and applications. It manages processes (which program runs when), memory (who gets which RAM), storage (file systems), devices (through drivers), networking, and security (users, permissions, and isolation).\n\nThe OS gives applications a consistent interface so developers do not write code for every specific graphics card or disk. Examples include Windows, macOS, and Linux on desktops and servers; Android and iOS on mobile; and specialised real-time operating systems in cars and industrial equipment. The core of the OS that talks directly to hardware is the kernel.",
    "The same browser code runs on thousands of different laptops because the OS and drivers handle each machine's specific hardware.",
    "Key OS jobs to remember: process management, memory management, file system management, device management, and security."
  ),
  'm3-2': n(
    "Firmware is the first code to run when a computer powers on. It initialises the hardware and finds something to boot. BIOS (Basic Input/Output System) is the legacy version: 16-bit, text-based menus, limited to MBR disks of up to 2 TB.\n\nUEFI (Unified Extensible Firmware Interface) replaced it with a modern design: support for GPT disks far larger than 2 TB, faster boot, network boot and mouse-driven setup screens, and Secure Boot. Secure Boot checks the digital signature of each bootloader and driver against trusted keys, blocking bootkits and rootkits that try to load before the OS. Many systems also offer a legacy CSM mode that emulates BIOS for old operating systems.",
    "Installing an old OS may require enabling legacy/CSM mode or disabling Secure Boot, which lowers protection. Turn it back on afterwards where possible.",
    "UEFI + GPT + Secure Boot is the modern secure baseline. Secure Boot defends against boot-level malware."
  ),
  'm3-3': n(
    "The boot process runs in stages. At power-on, the firmware performs POST (power-on self-test) to check the CPU, RAM, and essential hardware; failures are reported by beep codes or LEDs. The firmware then reads the boot order and finds a bootable device.\n\nThe bootloader (Windows Boot Manager, GRUB) loads the OS kernel into memory. The kernel initialises drivers, mounts the file systems, and starts system services (on Linux, systemd; on Windows, the Session Manager and services). Finally the login screen and user session appear. Knowing each stage lets you pinpoint where a failure happens.",
    "A PC that powers on but shows 'No bootable device' passed POST, but the firmware could not find a valid bootloader. Check the boot order, the drive, or the bootloader.",
    "Use the stage to troubleshoot: no POST = hardware; no boot device = storage/boot order; kernel panic or BSOD = drivers or OS."
  ),
  'm3-4': n(
    "A bootloader is a small program that the firmware hands control to. Its job is to find the operating system kernel, load it into memory, and start it, often passing configuration options. It can also show a menu for choosing between several operating systems or kernel versions.\n\nWindows XP and earlier used NTLDR; Windows Vista onwards uses BOOTMGR with its configuration stored in the BCD (Boot Configuration Data). Most Linux distributions use GRUB, which supports multi-boot menus and recovery options. If the bootloader or its configuration is damaged, the system cannot start even though the OS files are intact.",
    "After installing Windows alongside Linux, the Linux GRUB menu disappears because Windows overwrote the boot entry. Repairing GRUB restores the choice.",
    "On Windows, recovery tools such as `bootrec /fixmbr`, `bootrec /fixboot`, and `bcdboot` repair boot problems without reinstalling."
  ),
  'm3-5': n(
    "A partition table is a small data structure near the start of a disk that records where each partition begins and ends, its type, and which one is bootable. The operating system reads it to know how the disk is organised.\n\nThe two types you will meet are MBR (Master Boot Record), the legacy format, and GPT (GUID Partition Table), the modern standard; older Macs used APM. Because the partition table is so small and critical, corrupting it makes the entire disk look empty or unallocated even though the files are still physically there. Recovery tools such as TestDisk can often rebuild it.",
    "A USB drive that suddenly shows as 'unallocated' may have a damaged partition table; the data can often be recovered if you do not format it.",
    "Do not format a disk that suddenly appears empty. Try partition recovery first."
  ),
  'm3-6': n(
    "The Master Boot Record occupies the first 512-byte sector of an MBR disk. It contains a small piece of boot code plus a partition table with room for just four entries. Because it uses 32-bit sector addresses, MBR can only address disks of up to 2 TB with standard 512-byte sectors.\n\nThe four-entry limit means at most four primary partitions, or three primary plus one extended partition that contains logical drives. With only a single copy of the table and no checksum, MBR is fragile: overwrite that one sector and the disk's layout is lost. These limits are why GPT replaced it on modern systems.",
    "A new 4 TB disk initialised as MBR only lets you use 2 TB. Converting it to GPT exposes the full capacity.",
    "MBR: 2 TB max, 4 primary partitions, works with BIOS. GPT: huge disks, 128 partitions, required for UEFI boot."
  ),
  'm3-7': n(
    "GPT (GUID Partition Table) is part of the UEFI standard. Each partition gets a globally unique identifier, and the table uses 64-bit addressing, so disk size limits are effectively a non-issue (zettabytes). Windows supports up to 128 partitions by default with no need for extended or logical partitions.\n\nGPT is also more resilient. It stores a primary header and table at the start of the disk and a backup copy at the end, both protected by CRC32 checksums, so corruption can be detected and repaired. A 'protective MBR' in sector 0 stops older MBR-only tools from mistaking a GPT disk for empty space.",
    "Modern Windows installs on UEFI systems always use GPT for the boot disk, with a small EFI System Partition holding the bootloaders.",
    "UEFI boot requires GPT; BIOS boot uses MBR. If a disk is larger than 2 TB, use GPT."
  ),
  'm3-8': n(
    "MBR has room for only four partition entries. Primary partitions are the only ones that can be marked active and booted directly. To get past the limit, one of the four slots can be made an extended partition, which is just a container holding any number of logical partitions.\n\nSo a typical layout might be three primary partitions (for example system, recovery, and data) plus one extended partition containing several logical drives. Logical partitions work fine for storing data but traditionally cannot hold a BIOS-booted OS on Windows. GPT has no such distinction; all its partitions are equal.",
    "An older server's disk shows C:, D:, and E: as primary partitions and F:, G:, and H: as logical drives inside an extended partition.",
    "Remember: 4 primary max, OR 3 primary + 1 extended (holding unlimited logical). Only primary partitions can be active/bootable."
  ),
  'm3-9': n(
    "Formatting prepares a partition for use by writing a file system onto it: the boot sector, the master file table or inode tables, the free-space map, and the allocation unit (cluster) size that files are stored in.\n\nA quick format only writes those empty structures. It is fast, and the old data stays on the disk until overwritten, which is why recovery tools can sometimes bring files back. A full format also scans every sector for errors and, on modern Windows, writes zeros across the volume, which takes much longer. Neither is a guaranteed secure wipe, especially on SSDs, where you need vendor secure-erase or cryptographic erase.",
    "After accidentally quick-formatting a USB drive, recovery software retrieves most of the files because the data itself was never overwritten.",
    "Quick format ≠ secure deletion. For disposal, use purge or destroy methods (NIST SP 800-88)."
  ),
  'm3-10': n(
    "NTFS (New Technology File System) is the default file system for Windows system and data drives. It supports very large volumes and files, detailed access control lists (NTFS permissions) per file and folder, file compression, EFS encryption, disk quotas, and alternate data streams.\n\nNTFS is journaling: it logs metadata changes before committing them, so after a crash or power loss it can quickly return to a consistent state instead of scanning the entire disk. macOS can read NTFS natively but generally cannot write to it without extra software, and Linux supports it through the ntfs3 driver.",
    "An administrator uses NTFS permissions to let HR read a shared folder while only the HR manager can modify files in it.",
    "NTFS permissions apply locally and over the network; share permissions only over the network. The most restrictive combination wins."
  ),
  'm3-11': n(
    "ext4 (fourth extended file system) is the default on many Linux distributions. It supports volumes of up to 1 exabyte and files up to 16 TB, and it uses extents (contiguous block ranges) to store large files efficiently with less fragmentation.\n\nLike NTFS, ext4 journals metadata changes so it recovers quickly after crashes, and it remains backward compatible with ext2 and ext3. Linux permissions (owner, group, others with read, write, and execute bits) are stored per file. Alternatives include XFS (common on RHEL and for large files) and Btrfs (snapshots and checksums). Windows cannot read ext4 without third-party tools.",
    "A Linux web server's /var/log partition formatted as ext4 recovers cleanly after a sudden power loss, thanks to the journal.",
    "Check a Linux file system with `fsck` only on an unmounted volume. Running it on a mounted one can cause corruption."
  ),
  'm3-12': n(
    "FAT32 (File Allocation Table, 32-bit) is an old file system that nearly every device can read: Windows, macOS, Linux, cameras, game consoles, car stereos, and firmware update tools.\n\nIts limits are severe for modern use. The maximum single file size is 4 GB (minus 1 byte), Windows's built-in tools only create FAT32 volumes of up to 32 GB, and there are no permissions, encryption, or journaling. It remains useful for small USB sticks, UEFI boot partitions (the EFI System Partition is FAT32), and devices that support nothing else.",
    "Copying a 6 GB movie to a FAT32 USB stick fails with 'file too large' even though the stick has plenty of free space.",
    "The 4 GB file limit is the classic FAT32 exam clue. The fix is exFAT (portable) or NTFS (Windows only)."
  ),
  'm3-13': n(
    "exFAT (Extended File Allocation Table) was designed by Microsoft for flash storage. It keeps FAT's simplicity and broad compatibility while removing the 4 GB file size limit, so it can hold huge video files and very large volumes.\n\nWindows and macOS both read and write exFAT natively, and modern Linux kernels support it too, making it the go-to choice for external drives and SD cards shared between operating systems. Like FAT32, it has no journaling and no permissions, so it is not suitable for system drives, and unplugging without ejecting risks corruption.",
    "A video editor formats an external SSD as exFAT so the same drive works on the studio's Mac and the office's Windows PCs.",
    "Cross-platform external drive with large files = exFAT. Windows internal drive = NTFS."
  ),
  'm3-14': n(
    "A file name identifies a file, and the extension after the last dot hints at its type and which application should open it: .docx for Word, .pdf for documents, .exe for Windows programs, .sh for shell scripts. Operating systems use the extension (Windows) or file metadata and magic bytes to decide how to handle a file.\n\nWindows hides known extensions by default, which attackers exploit with names like invoice.pdf.exe. The user sees 'invoice.pdf' with a PDF-like icon but is really running a program. Windows file names are case-insensitive; Linux names are case-sensitive, so Report.txt and report.txt are two different files there.",
    "An email attachment named Payroll.xlsx.js turns out to be a JavaScript file that downloads malware when double-clicked.",
    "Security hardening: show file extensions in Windows Explorer, and block risky types (.exe, .js, .vbs, .scr) at the email gateway."
  ),
  'm3-15': n(
    "A file path is the address of a file in the directory tree. An absolute path starts from the root and works no matter where you are: C:\\Users\\Sam\\report.pdf on Windows, or /home/sam/report.pdf on Linux and macOS. A relative path starts from the current working directory, such as docs/report.pdf or ../report.pdf, where .. means the parent folder.\n\nWindows uses drive letters and backslashes (though most APIs accept forward slashes). Linux and macOS use one unified tree rooted at / with forward slashes, where extra drives are mounted as folders. Paths with spaces must be quoted in command lines. Scripts should build paths with helpers such as Python's pathlib rather than gluing strings together.",
    "A script works when run from its own folder but fails from a scheduled task because it used a relative path and the working directory was different.",
    "Path traversal attacks abuse ../ sequences to escape a folder. Validate and canonicalise paths in any code that takes file names as input."
  ),
  'm3-16': n(
    "As files are created, deleted, and grow, a file system on an HDD ends up storing pieces of a single file in scattered locations (fragmentation). Reading such a file forces the drive head to jump around the platter, which slows access.\n\nDefragmentation rewrites files so their pieces sit next to each other, and it groups free space together. Windows schedules this automatically ('Optimize Drives'). For SSDs, Windows instead sends TRIM, because SSDs have no moving head and no seek penalty. Defragmenting an SSD only wastes its limited write endurance.",
    "An old HDD-based PC that has been running for years without maintenance opens large files noticeably faster after a defrag.",
    "Defrag = HDD only. SSD = TRIM/optimise. If an exam asks how to speed up an SSD, defrag is the wrong answer."
  ),
  'm3-17': n(
    "A bad sector is a portion of the disk that can no longer be read or written reliably. Logical (soft) bad sectors come from inconsistencies such as a write interrupted by a power loss, and can often be repaired by rewriting or by tools such as chkdsk. Physical (hard) bad sectors are real damage to the magnetic surface or flash cells and cannot be fixed; the drive remaps them to spare sectors.\n\nDrives report their health through S.M.A.R.T. attributes such as reallocated sector count and pending sectors. A rising count is a strong warning that the drive is deteriorating, so back up immediately and plan a replacement.",
    "`chkdsk /r` on Windows locates bad sectors and recovers readable data; a S.M.A.R.T. warning in the BIOS says the drive is failing.",
    "Backup first, repair second. Running heavy scans on a dying drive can finish it off before you save the data."
  ),
  'm3-18': n(
    "Buffering and caching both hide speed differences between components, but they solve different problems. A buffer is temporary holding space that smooths the flow between a fast producer and a slow consumer (or the reverse): print jobs are buffered while the printer catches up, and video players buffer a few seconds ahead so network hiccups do not interrupt playback.\n\nA cache keeps copies of frequently or recently used data in faster storage so repeat requests skip the slow path: CPU caches, disk caches, browser caches, and DNS caches all work this way. Write-back caches improve speed but hold data that has not reached permanent storage yet, so a sudden power loss can lose or corrupt it unless there is a battery backup or a flush.",
    "A DNS resolver caches answers, so the second visit to a website skips the lookup; a RAID controller's battery-backed cache protects writes during power cuts.",
    "Buffer = smooth the flow; cache = reuse data. Stale caches cause many 'it works for me' problems. Know how to flush them (e.g. `ipconfig /flushdns`)."
  ),

  // ---------- IT Fundamentals: Binary & OS Internals ----------
  'f1-1': n(
    "Computers are built from billions of transistors, and each one is reliably either off or on. That two-state design maps naturally to binary, base 2, where every digit (a bit) is 0 or 1. It is far easier to build dependable hardware that distinguishes two voltage levels than ten.\n\nEverything a computer handles is ultimately a pattern of bits: numbers, letters, pixels, sounds, and program instructions. Eight bits form a byte, which can represent 256 different values (0–255). Larger data types simply use more bytes: a 32-bit integer uses 4 bytes, and an IPv4 address is 32 bits.",
    "The letter 'A' is stored as the byte 01000001 (65 in decimal) in ASCII/UTF-8.",
    "n bits give 2^n possible values. 8 bits = 256, 16 bits = 65,536, 32 bits ≈ 4.3 billion. This matters for addressing and subnetting."
  ),
  'f1-2': n(
    "A number system is a way of writing values using a base. Decimal (base 10) uses the digits 0–9 and is what humans use day to day. Binary (base 2) uses only 0 and 1 and is how hardware really stores data. Hexadecimal (base 16) uses 0–9 plus A–F, where A=10 and F=15.\n\nHexadecimal exists because it is a compact, human-friendly shorthand for binary: each hex digit represents exactly four bits. So one byte is always exactly two hex digits. The same value 255 is 11111111 in binary, FF in hex, and 255 in decimal. Octal (base 8) survives mainly in Linux file permissions such as 755.",
    "The colour #FFFFFF in a web page is three bytes (red, green, blue) each set to FF = 255, which gives white.",
    "Prefixes tell you the base: 0b for binary (0b1010), 0x for hex (0x1A), 0o for octal in Python (0o755)."
  ),
  'f1-3': n(
    "To convert binary to decimal, write the place values under each bit (from the right: 1, 2, 4, 8, 16, 32, 64, 128) and add up the positions that contain a 1. For example, 1101 = 8 + 4 + 0 + 1 = 13, and 11000000 = 128 + 64 = 192.\n\nTo convert decimal to binary, subtract the largest place value that fits and repeat: 200 = 128 + 64 + 8 → 11001000. To convert binary to hexadecimal, split the bits into groups of four from the right and convert each group separately: 1101 0010 → D2. Going from hex to binary reverses this, turning each hex digit into four bits.",
    "Subnet masks are easy once you know the pattern: 11111111.11111111.11111111.11000000 is 255.255.255.192, a /26.",
    "Memorise the byte place values 128, 64, 32, 16, 8, 4, 2, 1. They make subnetting questions fast."
  ),
  'f1-4': n(
    "Hexadecimal shows up constantly in IT because it is a compact way to display binary data. MAC addresses are six bytes written as twelve hex digits (00:1A:2B:3C:4D:5E). IPv6 addresses are eight groups of four hex digits. Web colours use hex (#FF5733), and memory addresses, file hashes, and packet dumps are shown in hex.\n\nError codes are often hex too: Windows errors like 0x80070005 (access denied) or blue-screen stop codes. When you see a 0x prefix or the letters A–F mixed with numbers, you are almost certainly reading hexadecimal, not decimal. Tools like Wireshark show packet bytes in hex alongside their ASCII meaning.",
    "The first half of a MAC address (the OUI) identifies the manufacturer, so you can look up which vendor made a device on your network.",
    "A SHA-256 hash is 256 bits = 32 bytes = 64 hex characters. Counting hex digits tells you the hash type."
  ),
  'f1-5': n(
    "A byte holds a number from 0 to 255, and character encodings define which numbers represent which characters. ASCII uses 7 bits for 128 characters: English letters, digits, punctuation, and control codes. Many old 8-bit code pages (such as Windows-1252) extended this for other languages but conflicted with each other.\n\nUnicode assigns a unique code point to every character in every writing system, including emoji. UTF-8 encodes Unicode using 1 to 4 bytes per character, is backward compatible with ASCII, and is the standard for the web, Linux, and most modern systems. Reading a file with the wrong encoding produces garbled 'mojibake', such as Ã© instead of é.",
    "A CSV exported as Windows-1252 shows broken accented names when imported by a system expecting UTF-8.",
    "Default to UTF-8 everywhere: files, databases, and APIs. Attackers also abuse encoding tricks to slip payloads past filters."
  ),
  'f1-6': n(
    "Every computer task follows the same four-stage model. Input brings data in from keyboards, sensors, files, or the network. Processing transforms it: the CPU executes instructions while RAM holds the working data. Output delivers results to a screen, printer, speaker, file, or another system. Storage persists data so it survives a restart and can be processed later.\n\nThis model scales from a pocket calculator to a cloud platform. A web server's input is an HTTP request, its processing is application code and database queries, its output is an HTTP response, and its storage is a database or object store. Thinking in these stages helps you find bottlenecks and failures quickly.",
    "A slow report might have a slow input (network), slow processing (CPU-bound query), slow output (rendering), or slow storage (disk I/O). Measure each stage.",
    "Use IPOS (input, process, output, storage) to break down any system during troubleshooting or design interviews."
  ),
  'term:BIOS vs UEFI': n(
    "BIOS and UEFI are motherboard firmware: the first code that runs at power-on. They test and initialise hardware, then locate and start a bootloader. Legacy BIOS runs 16-bit code, uses text menus, and only boots MBR disks of up to 2 TB.\n\nUEFI is the modern replacement. It supports GPT disks far beyond 2 TB, starts faster, can boot from the network and offers graphical setup screens, and provides Secure Boot, which verifies the digital signatures of bootloaders and drivers so bootkits and rootkits cannot load before the OS. Many UEFI systems can emulate BIOS through CSM (Compatibility Support Module) for older operating systems, at the cost of Secure Boot.",
    "Windows 11 requires UEFI with Secure Boot capability and a TPM 2.0, which is why many older BIOS-only PCs cannot upgrade.",
    "UEFI + GPT + Secure Boot is the secure modern baseline. Disabling Secure Boot to boot old media should be temporary."
  ),
  'f1-8': n(
    "A process is an instance of a running program with its own isolated virtual memory, open files, security context, and at least one thread. The OS keeps processes separated so one cannot directly read or corrupt another's memory.\n\nA thread is a unit of execution inside a process. All threads in a process share its memory and resources, which makes them cheap to create and fast to communicate with, but also means a bug in one thread (such as a race condition or crash) can affect the whole process. Modern browsers use a separate process per tab or site so one crashing or malicious page cannot take down the others.",
    "Task Manager or `ps` shows each Chrome tab as its own process; inside each, many threads handle rendering, networking, and JavaScript.",
    "Isolation = processes. Shared memory = threads. Security sandboxing relies on process boundaries."
  ),
  'f1-9': n(
    "Modern CPUs run code at different privilege levels. The kernel, the core of the OS, runs in kernel mode (ring 0) with unrestricted access to memory, hardware, and every process. Applications run in user mode (ring 3) with restricted privileges and their own virtual memory.\n\nWhen an application needs something privileged, such as reading a file, opening a network socket, or allocating memory, it makes a system call, and the kernel does the work on its behalf after checking permissions. This boundary means a crashing application usually just exits, while a crashing kernel or driver takes down the whole machine (a Blue Screen or kernel panic).",
    "A buggy graphics driver running in kernel mode can crash all of Windows, while a buggy game running in user mode only crashes itself.",
    "Privilege escalation attacks try to jump from user mode to kernel or administrator level. Keeping drivers minimal and signed reduces that risk."
  ),
  'f1-10': n(
    "Virtual memory gives every process its own large, private address space that the OS maps onto physical RAM in fixed-size pages. The memory management unit (MMU) in the CPU translates virtual addresses to physical ones, which also isolates processes from each other.\n\nWhen RAM runs low, the OS moves inactive pages out to a page file (Windows) or swap space (Linux) on disk and brings them back on demand (paging). This lets the system run more than physical RAM allows, but disk is far slower than RAM. If the system constantly swaps pages in and out (thrashing), it becomes painfully slow; the real fix is more RAM or fewer running programs.",
    "A server with high disk activity and slow response while memory sits near 100% is thrashing; adding RAM fixes it far better than a faster CPU.",
    "Swap is a safety net, not a substitute for RAM. Sensitive data can land in swap, so encrypt swap or the whole disk."
  ),
  'f1-11': n(
    "A command-line interface lets you control a system by typing commands instead of clicking. Common shells are Bash and Zsh on Linux and macOS, and PowerShell and CMD on Windows. The CLI is faster for experts, works over remote connections such as SSH, and, most importantly, can be scripted and automated.\n\nCore navigation and file commands include: cd (change directory), pwd (show the current directory), ls or dir (list), mkdir (make a directory), cp/copy and mv/move, rm or del (delete), and cat or type (show file contents). Searching is done with grep on Linux or Select-String in PowerShell. Pipes (|) send one command's output into another, chaining small tools into powerful one-liners.",
    "`Get-EventLog -LogName Security -Newest 50 | Where-Object EventID -eq 4625` quickly lists recent failed logons on a Windows host.",
    "Be careful with destructive commands. `rm -rf` on Linux does not use a recycle bin. Test with a dry run or on sample files first."
  ),

  // ---------- IT Project & Data Analytics ----------
  'f2-1': n(
    "Most IT projects follow a lifecycle of five phases. Initiation defines the business case, goals, and sponsor. Planning sets scope, schedule, budget, resources, risks, and communication. Execution builds and delivers the work. Monitoring and control run alongside execution, tracking progress against the baselines and handling change requests. Closeout confirms acceptance, hands the system over to operations, documents lessons learned, and releases the team.\n\nEach phase ends with a gate or approval. Skipping planning leads to scope creep and budget overruns; skipping closeout leaves undocumented systems that nobody owns or supports.",
    "A firewall migration project ends with a closeout handover: runbooks, diagrams, and support contacts go to the network operations team.",
    "The triple constraint is scope, time, and cost (with quality in the middle). Changing one affects the others."
  ),
  'f2-2': n(
    "Requirements describe what a system must do and how well it must do it. Functional requirements describe behaviour ('users can reset their password by email'). Non-functional requirements describe qualities such as performance, availability, security, usability, and compliance ('pages load in under 2 seconds; data is encrypted at rest').\n\nGather requirements through stakeholder interviews, workshops, observing current processes, user stories ('As a helpdesk agent, I want…'), and reviewing regulations. Good requirements are specific, measurable, testable, and prioritised (for example with MoSCoW: must, should, could, won't). Vague or missing requirements are the most expensive defects, because they are discovered late and cause rework.",
    "A requirement like 'the system should be secure' is untestable; 'all admin logins require MFA and are logged to the SIEM' can be verified.",
    "Security requirements belong at the start, alongside functional ones. Adding them late costs far more."
  ),
  'f2-3': n(
    "Waterfall runs phases in sequence (requirements, design, build, test, deploy), each finishing before the next begins. It suits projects with stable, well-understood requirements and heavy regulatory documentation, but it discovers problems late and handles change poorly.\n\nAgile delivers working increments in short iterations (sprints of 1–4 weeks) with continuous feedback, adapting priorities as the team learns. Scrum (sprints, roles, ceremonies) and Kanban (continuous flow with work-in-progress limits) are common frameworks. Many organisations run a hybrid: fixed governance milestones on the outside, agile delivery inside.",
    "A bank's core-ledger migration uses Waterfall-style gates for compliance, while the customer mobile app team runs two-week Scrum sprints.",
    "Agile does not mean no planning or no documentation; it means planning and documenting continuously and just enough."
  ),
  'f2-4': n(
    "Stakeholders are everyone who influences a project or is affected by it: sponsors, end users, operations teams, security and compliance, legal, vendors, and customers. Each has different interests and different levels of power.\n\nA stakeholder map (power vs interest) guides engagement: manage high-power, high-interest people closely; keep high-power, low-interest people satisfied; keep interested but less powerful groups informed. Regular status reports, a RACI chart (Responsible, Accountable, Consulted, Informed), decision logs, and clear escalation paths prevent surprises. Most failed projects fail through miscommunication, not technology.",
    "Involving the security team only at go-live forces a last-minute redesign; consulting them during planning avoids it.",
    "RACI: exactly one person should be Accountable for each deliverable."
  ),
  'f2-5': n(
    "A risk is an uncertain future event that could affect the project; an issue is a problem happening now. Risks are identified, assessed by likelihood and impact, assigned an owner, and given a response: avoid, mitigate, transfer, or accept. Each risk also needs a trigger that signals it is starting to happen.\n\nA risk register tracks all of this and is reviewed regularly. Issues go in an issue log with a severity, owner, workaround, and resolution date, and are escalated according to agreed thresholds. Good plans include contingency time and budget because some risks will occur.",
    "Risk: 'The vendor may deliver hardware late (medium likelihood, high impact).' Mitigation: order early and identify an alternate supplier. When the delay actually happens, it becomes an issue.",
    "The same response vocabulary (avoid, mitigate, transfer, accept) is used in Security+ and CISSP risk management."
  ),
  'f2-6': n(
    "Data quality measures how fit data is for its purpose. The usual dimensions are accuracy (correct values), completeness (no missing required fields), consistency (the same across systems), uniqueness (no duplicates), validity (matches formats and rules), and timeliness (up to date).\n\nPoor data quality spreads: wrong dashboards lead to wrong decisions, and machine learning trained on bad data makes bad predictions ('garbage in, garbage out'). Controls include validation at entry, data profiling to find anomalies, deduplication, master data management, and named data owners who are accountable for fixing problems at the source.",
    "Two customer records for 'J. Smith' and 'John Smith' with different addresses cause duplicate mailings and inaccurate customer counts.",
    "Fix data at the source rather than cleaning it downstream every time."
  ),
  'f2-7': n(
    "Analytics maturity describes how sophisticated an organisation's use of data is. Descriptive analytics asks 'what happened?' using reports and dashboards. Diagnostic analytics asks 'why did it happen?' by drilling down and correlating data. Predictive analytics asks 'what will happen?' using statistical models and machine learning. Prescriptive analytics asks 'what should we do?' by recommending or automating actions.\n\nEach level needs better data, tooling, and skills than the one before. Most organisations are strong at descriptive and diagnostic work; predictive and prescriptive analytics require clean historical data, data engineering pipelines, and ML expertise.",
    "Security operations moves up the curve: counting alerts (descriptive), finding root causes (diagnostic), forecasting likely breaches (predictive), and automatically isolating risky hosts (prescriptive).",
    "Build reliable descriptive data first; advanced models are only as good as the data beneath them."
  ),
  'f2-8': n(
    "A KPI (key performance indicator) turns a goal into a measurable target with an owner, a formula, a data source, and a threshold. Lagging indicators show results after the fact (monthly revenue, incidents last quarter); leading indicators predict future results (patch compliance, training completion).\n\nGood dashboards answer a specific audience's questions at a glance. Show trends over time instead of single numbers, highlight exceptions against thresholds, keep time windows and definitions consistent, and make the next action obvious. Avoid vanity metrics that look good but drive no decision, and avoid crowded tables that hide the story.",
    "A security dashboard for executives shows mean time to detect and respond, critical vulnerabilities past due, and phishing click rate, each trended against its target.",
    "Every KPI needs an owner and an action when it goes red; otherwise it is just decoration."
  ),
  'f2-9': n(
    "An A/B test randomly splits users into a control group (A) and a treatment group (B) that sees one change, then compares a predefined metric. Randomisation balances out other factors, so differences can be attributed to the change.\n\nValid experiments need a hypothesis, a primary metric chosen in advance, an adequate sample size (estimated with a power calculation), a fixed duration, and statistical significance testing. Common mistakes include stopping early when results look good ('peeking'), testing many metrics and picking the winner, and changing several things at once. Record negative and neutral results too; they prevent repeated mistakes.",
    "A team tests a new MFA enrolment screen against the old one and measures completion rate over two weeks with 20,000 users per group.",
    "Correlation is not causation. Only a randomised controlled experiment supports a causal claim."
  ),
  'f2-10': n(
    "Data storytelling combines data, visuals, and narrative so a specific audience understands a situation and acts. Start with the key message or recommendation, then show the evidence that supports it, then explain context such as causes, comparisons, and trends.\n\nChoose charts that fit the message (line charts for trends, bars for comparisons), label clearly, remove clutter, and highlight what matters. Tailor the depth to the audience: executives need the 'so what' and the decision; engineers need the detail. Always state limitations and assumptions so decisions are not built on overconfidence.",
    "Instead of a 40-row vulnerability export, a security lead presents: 'Critical exposure fell 60% this quarter; two legacy servers remain the top risk; approve funding to replace them.'",
    "Lead with the conclusion (Bottom Line Up Front), then support it."
  ),

  // ---------- Python for Automation ----------
  'py-1': n(
    "Python is a readable, general-purpose language that uses indentation instead of braces to mark code blocks. Its built-in types cover most needs: int and float for numbers, str for text, bool for True/False, list (ordered and mutable), tuple (ordered and immutable), dict (key-value pairs), and set (unique items).\n\nControl flow uses if/elif/else, for loops over any iterable, while loops, and (since Python 3.10) match statements for pattern matching. Functions are defined with def, can take default and keyword arguments, and return values. Comprehensions such as [x * 2 for x in items if x > 0] build new collections concisely and idiomatically.",
    "`hosts = {ip for ip in log_ips if ip.startswith('10.')}` builds a set of unique internal IPs from a list in one readable line.",
    "Use four spaces per indent level and never mix tabs and spaces (PEP 8)."
  ),
  'py-2': n(
    "A script is a short program written to automate a specific task quickly, such as renaming files, parsing a log, or calling an API once. It often lives in a single file and is run by hand or on a schedule.\n\nA program or application adds structure for long-term maintenance: multiple modules and packages, classes, configuration files, command-line arguments (argparse or click), logging, error handling, tests, and packaging for installation. Many useful tools start as scripts and grow into programs. The trick is to refactor into functions and tests as soon as others start depending on the script.",
    "A one-off script that audits user accounts becomes a scheduled internal tool, so the team adds argparse options, logging, and pytest tests.",
    "Put the entry point under `if __name__ == \"__main__\":` so the file can be imported and tested without running."
  ),
  'py-3': n(
    "Python reads and writes files with open(). Always use a with block (with open(path) as f:) so the file closes automatically, even if an error occurs. Open in text mode for strings (specify encoding='utf-8') or binary mode ('rb', 'wb') for raw bytes such as images.\n\nThe pathlib module represents paths as objects: Path.home() / 'reports' / 'jan.csv' builds a path that works on Windows, macOS, and Linux. Path objects offer .exists(), .glob('*.log'), .read_text(), and .mkdir(parents=True). Standard modules handle common formats: csv for spreadsheets, json for APIs and configuration, and PyYAML for YAML files.",
    "`for log in Path('/var/log/app').glob('*.log'): print(log.name, log.stat().st_size)` lists log files and their sizes on any OS.",
    "Avoid hard-coded absolute paths and string concatenation for paths. Use pathlib for portability and safety."
  ),
  'py-4': n(
    "The requests library makes HTTP calls simple: requests.get(url, params=..., headers=..., timeout=10) and requests.post(url, json=payload). APIs usually authenticate with an API key or bearer token in the Authorization header. Responses expose .status_code, .headers, and .json().\n\nRobust API code always sets a timeout, checks status codes (response.raise_for_status()), handles rate limits (HTTP 429) with retries and exponential backoff, and follows pagination links to get all results. A requests.Session reuses connections and shared headers across many calls, which is faster and cleaner.",
    "A script pulls open tickets from a helpdesk API page by page, retrying on 429 and 5xx errors, then writes a CSV summary.",
    "Never put tokens in the URL or in code. Read them from environment variables or a secrets manager."
  ),
  'py-5': n(
    "Automation often means pulling structured information out of messy input. json.loads() turns JSON text into Python dicts and lists, and json.dumps() does the reverse. The re module finds patterns with regular expressions, for example IP addresses, error codes, or usernames in log lines. For HTML, BeautifulSoup navigates tags and attributes; for XML, use ElementTree or defusedxml (safer against XML attacks).\n\nTo parse command-line tool output, run the tool with subprocess.run(..., capture_output=True, text=True) and process stdout, though a tool's JSON output option is much more reliable than scraping text. When scraping websites, respect robots.txt and terms of service, rate-limit your requests, and prefer official APIs.",
    "A regex like `r'Failed password for (\\w+) from (\\d+\\.\\d+\\.\\d+\\.\\d+)'` extracts usernames and source IPs from SSH auth logs.",
    "Parse untrusted XML with defusedxml to avoid XML External Entity (XXE) attacks."
  ),
  'py-6': n(
    "Python can drive the operating system directly. subprocess.run() executes other programs safely, replacing the old os.system(). Pass arguments as a list and avoid shell=True with user input. The os, shutil, and pathlib modules move, copy, and delete files; the platform and psutil modules report system information.\n\nFor timing, schedule jobs with cron (Linux), Task Scheduler (Windows), or systemd timers rather than keeping a script running forever. The watchdog library reacts to file system changes, and pyautogui can drive a GUI when there is truly no API. GUI automation is brittle, so prefer APIs and CLIs whenever they exist.",
    "A nightly job zips yesterday's logs with shutil.make_archive, uploads them to storage, and deletes local copies older than 30 days.",
    "`subprocess.run(['ping', '-c', '1', host])` is safe; `subprocess.run(f'ping {host}', shell=True)` with user input is command injection waiting to happen."
  ),
  'py-7': n(
    "For small datasets, plain Python lists, dicts, and the csv module are enough: loop, filter with comprehensions, and count with collections.Counter. For larger tabular data, pandas provides the DataFrame: read_csv() and read_json() to load, boolean masks to filter, groupby() to aggregate, merge() to join tables, and pivot_table() to reshape.\n\nAs pipelines grow, add structure: dataclasses or Pydantic models for typed records, type hints for readability, and small functions that each do one transformation and can be tested. Keep raw input untouched and write results to new files so any step can be re-run.",
    "`df.groupby('src_ip')['bytes'].sum().nlargest(10)` shows the ten hosts sending the most data in a firewall log export.",
    "Validate the shape and types of the data before processing. A silently wrong column breaks every downstream report."
  ),
  'py-8': n(
    "pytest is the standard testing tool: write functions named test_* containing plain assert statements, and run pytest to find and execute them. Fixtures provide reusable setup, parametrize runs the same test with many inputs, and unittest.mock replaces external systems such as APIs or databases with fakes.\n\nFor debugging, use the logging module (with levels DEBUG, INFO, WARNING, and ERROR) instead of print, so output can be filtered and sent to files or a SIEM. Read tracebacks from the bottom up to find the failing line. Use breakpoint() or an IDE debugger to pause execution and inspect variables. Catch specific exceptions and re-raise or log them with context rather than silently swallowing errors.",
    "A test mocks the ticketing API and confirms the script creates exactly one ticket per critical alert, so it never spams the real system during development.",
    "Bare `except:` hides bugs, including Ctrl+C. Catch specific exceptions, and use `logging.exception()` to keep the traceback."
  ),
  'py-9': n(
    "A virtual environment is an isolated Python installation per project, so each project can pin its own dependency versions without breaking others or the operating system's Python. Create one with python -m venv .venv (or uv venv), activate it, and install packages inside.\n\nModern projects declare metadata and dependencies in pyproject.toml. Lock files (from uv, Poetry, or pip-tools) record exact versions and hashes so every installation is reproducible. pip install -e . installs your own package in editable mode for development. Never install packages into the system Python with sudo pip; it can break OS tools that depend on it.",
    "Two scripts need different versions of the same library; separate virtual environments let both run on one server without conflicts.",
    "Pin and audit dependencies (for example with pip-audit). Unpinned 'latest' versions let a compromised release slip into production."
  ),
  'py-10': n(
    "Automation scripts often hold broad access to servers, cloud accounts, or APIs, which makes them valuable targets. Keep secrets out of code and git: load them from environment variables, a .env file excluded from version control, or a secrets manager such as AWS Secrets Manager or Vault, and give each script the least privilege it needs.\n\nTreat all external input as untrusted. Validate and sanitise it, use parameterised SQL queries, and avoid dangerous functions: eval() and exec() run arbitrary code, pickle.load() on untrusted data can execute code, and subprocess with shell=True enables command injection. Log security-relevant actions without logging the secrets themselves.",
    "A leaked GitHub repository containing a hard-coded cloud access key is found by automated scanners within minutes; the account starts mining cryptocurrency.",
    "If a secret was ever committed, rotate it. Deleting the line does not remove it from git history."
  ),

  // ---------- Database Fundamentals ----------
  'db-1': n(
    "The relational model stores data in tables (relations) made of rows (records) and columns (attributes) with defined data types. Each table has a primary key that uniquely identifies every row. Foreign keys reference primary keys in other tables to express relationships such as one-to-many (a customer has many orders) or many-to-many (through a junction table).\n\nNormalisation organises tables to remove redundancy and update anomalies. First, second, and third normal form ensure each fact is stored once. Denormalisation deliberately duplicates some data to speed up reads in reporting or high-traffic systems. Popular relational databases include PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, and Oracle.",
    "Storing the customer's address in every order row means changing it in hundreds of places; normalising puts it once in a customers table referenced by orders.",
    "Constraints (NOT NULL, UNIQUE, FOREIGN KEY, CHECK) enforce data integrity in the database itself, not just in application code."
  ),
  'db-2': n(
    "SQL (Structured Query Language) is declarative: you describe the result you want and the database decides how to get it. SELECT chooses columns, FROM picks tables, WHERE filters rows, JOIN combines related tables (INNER, LEFT, RIGHT, FULL), GROUP BY aggregates with COUNT, SUM, and AVG, HAVING filters groups, and ORDER BY sorts. INSERT, UPDATE, and DELETE change data.\n\nTransactions group statements into one unit of work with BEGIN, COMMIT, and ROLLBACK, so either all of them apply or none do. From application code, always use parameterised queries (placeholders) rather than building SQL strings from user input; that single practice prevents SQL injection.",
    "`SELECT user, COUNT(*) FROM logins WHERE success = false GROUP BY user HAVING COUNT(*) > 10;` finds accounts with many failed logins.",
    "Always run an UPDATE or DELETE with a WHERE clause as a SELECT first to see exactly which rows it will touch."
  ),
  'db-3': n(
    "An index is an extra data structure, usually a B-tree, that keeps a column's values sorted with pointers to the rows, like the index at the back of a book. With an index, the database can jump straight to matching rows instead of scanning the whole table, which makes WHERE filters, JOINs, and ORDER BY far faster.\n\nIndexes are not free: every INSERT, UPDATE, and DELETE must also update each index, and indexes take storage. Index the columns you filter and join on most. Use EXPLAIN (or EXPLAIN ANALYZE) to read the query plan and see whether the database uses an index or performs a full table scan. Composite indexes follow column order, so an index on (last_name, first_name) helps queries on last_name but not first_name alone.",
    "A login lookup by email takes 2 seconds on a million-row table; adding an index on email cuts it to under a millisecond.",
    "Slow query? Read the plan before adding hardware. A missing index is the most common cause."
  ),
  'db-4': n(
    "ACID describes the guarantees of reliable database transactions. Atomicity: a transaction is all or nothing; if any part fails, everything rolls back. Consistency: a transaction moves the database from one valid state to another, respecting every constraint. Isolation: concurrent transactions do not interfere, as if they ran one after another (with configurable isolation levels). Durability: once committed, data survives crashes, usually because it is written to a write-ahead log first.\n\nThese guarantees are essential for money, inventory, and identity data. Weaker isolation levels (read committed, repeatable read) trade some isolation for performance and allow anomalies such as non-repeatable reads or phantom rows.",
    "A bank transfer debits one account and credits another in a single transaction; if the credit fails, atomicity rolls the debit back, so money never disappears.",
    "Integrity questions about transactions usually point to ACID. Durability is typically provided by the transaction log."
  ),
  'db-5': n(
    "NoSQL databases relax the relational model to gain horizontal scale, flexible schemas, or speed for specific access patterns. Document stores (MongoDB, DynamoDB, Firestore) keep JSON-like documents that can nest related data. Key-value stores (Redis, DynamoDB) return a value for a key extremely quickly and are ideal for caches and sessions. Wide-column stores (Cassandra, Bigtable) handle huge write volumes across many nodes. Graph databases (Neo4j, Neptune) model relationships as first-class data.\n\nMany NoSQL systems offer eventual consistency by default and weaker transaction support than SQL databases, though several now support ACID transactions. Choose based on access patterns, not hype.",
    "An app stores user sessions in Redis for sub-millisecond lookups, product catalogues in MongoDB, and orders in PostgreSQL for transactional integrity.",
    "NoSQL is still vulnerable to injection (for example MongoDB operator injection). Validate input for every database type."
  ),
  'db-6': n(
    "The CAP theorem says that when a network partition splits a distributed system, it must choose between consistency (every read returns the latest write or an error) and availability (every request gets a response, possibly with stale data). Partition tolerance is not optional in real networks, so the true trade-off during a partition is C versus A.\n\nCP systems (for example ZooKeeper, etcd, and many SQL clusters) refuse or delay requests rather than return stale data. AP systems (for example Cassandra and DynamoDB in default modes) stay available and reconcile later (eventual consistency). Many databases let you tune this per operation, for example with quorum reads and writes. PACELC extends CAP: even without a partition, you trade latency against consistency.",
    "A shopping cart can tolerate brief inconsistency (AP), but a bank balance or a distributed lock must be consistent (CP).",
    "Tie the choice to business impact: stale data is annoying for a like-counter and dangerous for a payment ledger."
  ),
  'db-7': n(
    "Data modelling designs how data is structured and related so the system can store it correctly and query it efficiently. In relational systems, start with entities, relationships, and normalisation, then add indexes for the main queries. In NoSQL systems, model around access patterns first: decide which questions the application asks, then shape documents or keys to answer them in one lookup.\n\nEmbed data you always read together; reference data that changes independently or grows without bound. Watch for unbounded arrays inside documents and 'hot' partition keys that concentrate traffic on one node. Classify sensitive fields (PII, card data) early so encryption, masking, and access control can be designed in.",
    "In DynamoDB, a key of `CUSTOMER#123` with sort keys `ORDER#2026-09-01` lets one query fetch a customer's recent orders efficiently.",
    "A good model starts from the queries. Ask 'how will this be read?' before 'how does it look?'"
  ),
  'db-8': n(
    "Replication copies data to multiple nodes. A primary accepts writes and replicas follow it, which provides failover for high availability and extra read capacity. Synchronous replication waits for replicas to confirm each write (safer, slower); asynchronous replication does not (faster, but a failover can lose the latest writes).\n\nSharding (horizontal partitioning) splits data across nodes by a shard key, such as customer ID, so each node holds only part of the data and write capacity scales out. It adds complexity: choosing a key that spreads load evenly, rebalancing when adding nodes, and handling queries or transactions that span shards. Many teams replicate first and shard only when a single primary can no longer keep up.",
    "A global app shards users by region for write scale and keeps read replicas in each region for low-latency reads.",
    "Replication is not a backup: a bad DELETE replicates instantly. Keep point-in-time backups too."
  ),
  'db-9': n(
    "A cache stores frequently read data in a fast store such as Redis or Memcached to cut database load and latency. Cache-aside (lazy loading) has the application check the cache, fall back to the database on a miss, and populate the cache. Write-through writes to the cache and the database together so the cache is always fresh. Write-behind writes to the cache first and flushes to the database asynchronously (fast, but data can be lost on failure).\n\nA TTL (time to live) expires entries automatically so stale data does not live forever. Invalidating the cache when the underlying data changes is the hardest part. Also plan for cache stampedes, when many requests miss at once and hammer the database.",
    "A product page caches price and stock for 60 seconds; a price update explicitly deletes that product's cache key so customers see the change immediately.",
    "Never cache sensitive per-user data under a shared key; that mistake has leaked other users' account pages."
  ),
  'db-10': n(
    "Change data capture reads a database's transaction log (the PostgreSQL WAL, the MySQL binlog, SQL Server CDC) and publishes every insert, update, and delete as an event, usually to a stream such as Kafka or Kinesis. Because it reads the log, it captures every change without modifying application code and with little load on the database.\n\nDownstream systems subscribe to keep search indexes, caches, data warehouses, and microservices in sync in near real time. Common tools include Debezium, AWS DMS, and Fivetran. CDC is also valuable for auditing and for migrating databases with minimal downtime.",
    "Every change to the orders table flows through Debezium into Kafka, updating the analytics warehouse within seconds and invalidating the order cache.",
    "CDC streams can contain sensitive data. Encrypt the stream and apply the same access controls as the source database."
  ),
};
