// Reading content for the Introduction to Information Technology course
// (the IT Foundations on-ramp), keyed by lesson (deck) id. Strings support
// `inline code` only. Aligned with src/data/academy/intro-it.js.

const code = (...lines) => lines.join('\n');

export default {
  'it-what-is-it': {
    overview: [
      'Information technology is the discipline of making computers, networks, and software work for people. It covers everything from the laptop on your desk to the servers that answer your search queries — and the people who keep all of it running.',
      'This course is the foundation of the IT Foundations path. It answers the questions every IT professional is assumed to know: what a computer is, how it counts and stores information, what the parts inside it do, and how to work with files and the command line.',
    ],
    learn: [
      {
        heading: 'What "information technology" actually means',
        body: [
          'IT is the technology side of handling information. It has four parts that always appear together: hardware (the physical machines), software (the instructions that run on them), networks (the connections between machines), and data (the information itself). Change one and the others feel it.',
          'The word "technology" is the giveaway: IT is not about the information itself — that is the business\'s job — but about the systems that store it, move it, protect it, and put it in front of the people who need it.',
        ],
      },
      {
        heading: 'Hardware, software, and the cycle that connects them',
        body: [
          'Every computer job follows the same cycle: input, process, output, storage. Data comes in through a keyboard, a mouse, a file, or a sensor; the CPU processes it; a result comes out on a screen, a printer, or a speaker; and the result is saved to storage if it is worth keeping. The cycle is the same whether you are writing an email or training a model.',
          'Software splits into two layers. System software — the operating system — runs the machine: it manages hardware, memory, files, and programs. Application software — browsers, editors, games — does a specific job for a specific person, and it always runs on top of the operating system.',
        ],
      },
      {
        heading: 'Clients, servers, and the people who keep it running',
        body: [
          'Most computing today is client–server. A client asks for a service; a server provides it. Your browser is a client when it asks a web server for a page, and one server can answer thousands of clients at once. Servers are built for that job: they stay on, they have redundant parts, and they run server operating systems.',
          'The IT support technician sits between the systems and the people. The job is mostly diagnosis and communication: understand what is wrong, find the cause, fix it, and show the user how to avoid it next time. Every other course on this path assumes you can already think this way.',
        ],
      },
    ],
    cheatSheet: [
      ['Hardware', 'The physical parts of a computer — CPU, RAM, drive, screen, keyboard.'],
      ['Software', 'The instructions that run on hardware — operating systems and apps.'],
      ['System software', 'Software that runs the machine itself, above all the operating system.'],
      ['Application', 'Software built for a specific user task, like writing or browsing.'],
      ['Data', 'Raw facts, numbers, and text with no meaning attached yet.'],
      ['Information', 'Data given meaning and context, so it answers a question.'],
      ['Network', 'Computers connected so they can share resources and communicate.'],
      ['Client–server', 'A client requests a service; a server provides it to many clients.'],
    ],
  },
  'it-binary-basics': {
    overview: [
      'A computer is built from switches. Each switch has two reliable states — off and on — and the whole machine is made by combining billions of them. Binary is simply the number system that matches that hardware: two digits, 0 and 1, instead of the ten we use.',
      'Binary looks strange at first, but it is just counting with a different base. Once you can read a binary number and convert it to decimal and hexadecimal, every number you meet in IT — addresses, sizes, error codes — becomes readable.',
    ],
    learn: [
      {
        heading: 'Bits, bytes, and why two states are enough',
        body: [
          'A bit is one binary digit, 0 or 1 — a single switch state. Eight bits make a byte, the unit computers use for one character, one pixel value, or one step of a measurement. A byte can hold 2^8 = 256 different patterns, the values 0 through 255.',
          'Two states are enough because they are reliable. A switch that is clearly off or clearly on can be read correctly billions of times a second. Anything with more states would be slower, hotter, and more error-prone — which is why every computer ever built counts in binary.',
        ],
      },
      {
        heading: 'Reading binary like a number line',
        body: [
          'Binary positions double as you move left: 1, 2, 4, 8, 16, 32, and so on. To read 1101, add the positions that hold a 1: 1 + 4 + 8 = 13. To write 10 in binary, use the positions that add to 10: 8 + 2, so 1010. The same skill reads any binary number, however long.',
          'Sizes work the same way, in powers of two: 1 KB is 1,024 bytes, 1 MB is 1,024 KB, and 1 GB is 1,024 MB. Disk makers advertise in powers of ten, which is why a drive labelled "1 TB" shows about 931 GB in Windows — the same bytes, measured with a different ruler.',
        ],
      },
      {
        heading: 'Hexadecimal: the shorthand',
        body: [
          'Long binary strings are hard to read, so IT uses hexadecimal — base 16, digits 0–9 then A–F. One hex digit maps to exactly four bits, so conversion is a straight grouping: 1101 0010 becomes D2, no arithmetic needed. The 0x prefix marks a number as hex, so 0x1F and 31 are the same value written two ways.',
          'You will see hex everywhere: memory addresses, colour codes, error codes, and network addresses. Learning to read it is not a party trick — it is how you read the output of the tools you will use daily.',
        ],
      },
      {
        heading: 'Characters: ASCII and UTF-8',
        body: [
          'Text is numbers too. ASCII is the original standard: each character gets a number from 0 to 127 — A is 65, a is 97 — and one byte holds one character. It covers English and nothing else, which was fine until the internet went global.',
          'UTF-8 is the standard that replaced it. Ordinary English characters still take one byte, so ASCII text is valid UTF-8, but accented letters, Arabic, Chinese, and emoji take two to four bytes. Every web page, every API, and every modern file format speaks UTF-8.',
        ],
      },
    ],
    architecture: {
      caption: 'Reading binary: each position doubles. Add the positions that hold a 1.',
      diagram: code(
        '  position value:   8   4   2   1',
        '  binary digits:    1   1   0   1   =  8 + 4 + 1  =  13',
        '',
        '  one hex digit = 4 bits:',
        '  1101 0010  ->  D    2   (0xD2 = 210)',
      ),
    },
    examples: [
      {
        title: 'Binary to decimal, step by step',
        code: code(
          '1101   ->  1×8 + 1×4 + 0×2 + 1×1  =  13',
          '1010   ->  1×8 + 0×4 + 1×2 + 0×1  =  10',
          '11111111  ->  128 + 64 + 32 + 16 + 8 + 4 + 2 + 1  =  255',
        ),
        explanation: 'Write the position values above the digits, keep the positions with a 1, and add them.',
      },
      {
        title: 'Decimal to hex, via binary',
        code: code(
          '255  ->  binary 1111 1111  ->  groups 1111 1111  ->  F F  =  0xFF',
          '210  ->  binary 1101 0010  ->  groups 1101 0010  ->  D 2  =  0xD2',
          '31   ->  binary 0001 1111  ->  groups 0001 1111  ->  1 F  =  0x1F',
        ),
        explanation: 'Split the binary into groups of four bits from the right; each group is one hex digit.',
      },
    ],
    cheatSheet: [
      ['Bit', 'One binary digit, 0 or 1 — the smallest unit of data.'],
      ['Byte', 'Eight bits; holds one character or one value from 0 to 255.'],
      ['Nibble', 'Four bits — exactly one hexadecimal digit.'],
      ['Binary', 'Base 2; positions double leftwards: 1, 2, 4, 8, 16…'],
      ['Hexadecimal', 'Base 16; digits 0–9, A–F. One digit per four bits.'],
      ['ASCII', 'The original character standard: numbers 0–127 for letters and symbols.'],
      ['UTF-8', 'The web standard for text; ASCII-compatible, covers every writing system.'],
      ['1 KB', '1,024 bytes. 1 MB = 1,024 KB; 1 GB = 1,024 MB.'],
    ],
  },
  'it-hardware': {
    overview: [
      'A computer is a team of parts, and each part has one job. The CPU does the thinking, memory holds what is being worked on, storage keeps what must survive a shutdown, and the motherboard connects them all so data can flow between them.',
      'This lesson names the parts inside a desktop computer and explains what each one actually does — the vocabulary you need before you open a case, read a specification sheet, or choose a machine for a job.',
    ],
    learn: [
      {
        heading: 'The CPU: fetch, decode, execute',
        body: [
          'The CPU runs programs by repeating one cycle: fetch an instruction from memory, decode what it means, execute it, and move to the next. It does this billions of times a second — the clock speed in gigahertz is how many cycles it runs per second.',
          'Clock speed is only part of performance. A newer CPU design does more work per cycle than an older one at the same speed, and a CPU with more cores can do several things genuinely at once. When you compare processors, look at the generation, the core count, and the cache — not just the GHz number.',
        ],
      },
      {
        heading: 'Cores, clocks, and cache',
        body: [
          'A core is an independent processing unit inside the chip. A quad-core CPU is four processors in one package, and the operating system spreads programs across them. Multiprocessing is real parallelism — two cores, two jobs at once — while multitasking is the OS rapidly switching one core between jobs so they all appear to run together.',
          'Cache is the fast, small memory built into or next to the CPU for data it uses constantly. L1 is the fastest and smallest, then L2, then L3 — each a trade-off between speed and size. Cache exists because RAM is too slow to keep a 3 GHz CPU fed; without it, the processor would spend most of its time waiting.',
        ],
      },
      {
        heading: 'The motherboard and the chipset',
        body: [
          'The motherboard is the main circuit board. The CPU, RAM, storage, and expansion cards all plug into it, and it carries power and data between them. Its sockets and slots decide what you can install: which CPUs fit, how much RAM it takes, and which expansion cards it accepts.',
          'The chipset is the motherboard\'s traffic controller and rulebook. It governs which CPUs, memory speeds, and expansion cards the board supports — two boards with the same CPU socket can support different processors if their chipsets differ. When a part "is not supported", the chipset is usually the reason.',
        ],
      },
      {
        heading: 'Memory, storage, and the ports between them',
        body: [
          'RAM is the computer\'s working memory: fast, temporary, and gone the moment the power goes off. ROM and its modern flash-based forms hold firmware that survives without power — the code the machine needs to start at all. Storage — hard drives and SSDs — holds everything else, permanently.',
          'Everything connects through buses. PCIe is the high-speed expansion bus: graphics cards, network cards, and NVMe drives plug into PCIe slots for a direct, fast path to the CPU and RAM. USB, HDMI, and Ethernet are the external ports — slower, but hot-swappable and universal.',
        ],
      },
    ],
    cheatSheet: [
      ['CPU', 'The processor: fetches, decodes, and executes instructions.'],
      ['Core', 'An independent processing unit inside the CPU chip.'],
      ['Clock speed', 'Cycles per second, in GHz — only part of CPU performance.'],
      ['Cache', 'Very fast, small memory near the CPU (L1 fastest, then L2, L3).'],
      ['Motherboard', 'The main board connecting every component in the computer.'],
      ['Chipset', 'Governs which CPUs, memory speeds, and cards the board supports.'],
      ['RAM', 'Volatile working memory for programs running right now.'],
      ['PCIe', 'The high-speed bus for expansion cards and NVMe drives.'],
    ],
  },
  'it-storage-memory': {
    overview: [
      'Computers keep two kinds of memory, and confusing them is the most common beginner mistake. Storage keeps data after the power goes off — your files live there. Memory (RAM) holds what is being worked on right now, and forgets it the moment the machine shuts down.',
      'This lesson follows data down the memory hierarchy, from the CPU\'s registers to the hard drive, and explains how disks are organised into partitions and file systems — the ground every later course stands on.',
    ],
    learn: [
      {
        heading: 'The memory hierarchy',
        body: [
          'Storage is a ladder. At the top, registers and cache are fastest but tiny — they hold what the CPU is touching this instant. RAM is the middle: big enough for every running program, fast enough to keep up. At the bottom, SSDs and hard drives are slowest but huge, holding everything the machine owns.',
          'Each level exists because the one above it is too small and the one below it is too slow. Data moves up the ladder when it is needed and down again when it is not. The whole art of performance is keeping the data the CPU needs next as high up the ladder as possible.',
        ],
      },
      {
        heading: 'Hard drives: spinning rust',
        body: [
          'A hard drive stores data magnetically on spinning platters. A read/write head floats nanometres above the platter and flips magnetic spots to write a 1 or a 0. The smallest unit the drive can address is a sector — traditionally 512 bytes — and a file is a chain of sectors.',
          'HDD speed is measured in RPM: how fast the platters spin, usually 5,400 or 7,200. Higher RPM means the head reaches data sooner. But any spinning disk is slow compared with flash, because the head must physically move — which is also why a dropped laptop can kill a hard drive and leave an SSD unharmed.',
        ],
      },
      {
        heading: 'SSDs: flash, wear, and TRIM',
        body: [
          'An SSD stores data in flash chips with no moving parts. It is fast, silent, and shock-proof — and its cells survive only a limited number of writes. The controller spreads writes evenly across the cells (wear levelling) and uses TRIM — a message from the OS saying which blocks are free — so the drive stays fast and lasts for years of daily use.',
          'That write limit has one practical rule: never defragment an SSD. Defrag exists for spinning disks, where reading a scattered file means waiting for the platter. On flash every address is equally fast, so defrag gains nothing and burns through the drive\'s write budget for free.',
        ],
      },
      {
        heading: 'Partitions and formatting',
        body: [
          'Partitioning divides one physical disk into separate logical volumes — one for the system, one for data, or one per operating system on a dual-boot machine. The partition table records where each volume starts and ends; MBR and GPT are the two formats, covered in the operating-systems lesson.',
          'Formatting writes a file system on a volume so the operating system can store and find files — the empty index of files, folders, and free space. Quick format writes a fresh index; full format also checks every sector. A growing count of bad sectors — damaged areas that can no longer hold data — is a warning: back the drive up and replace it.',
        ],
      },
    ],
    cheatSheet: [
      ['Storage', 'Keeps data after the power goes off — SSDs and hard drives.'],
      ['Memory (RAM)', 'Volatile working memory for programs running right now.'],
      ['HDD', 'Hard disk drive: magnetic platters, cheap per GB, slower, fragile.'],
      ['SSD', 'Solid-state drive: flash chips, no moving parts, fast, shock-proof.'],
      ['Sector', 'The smallest addressable unit on a disk, traditionally 512 bytes.'],
      ['Partition', 'A logical division of a disk, behaving as a separate volume.'],
      ['Formatting', 'Writing a file system on a volume so the OS can store files.'],
      ['TRIM', 'The OS telling an SSD which blocks are free, keeping it fast.'],
    ],
  },
  'it-os-boot': {
    overview: [
      'The operating system is the middleman between applications and hardware. It decides who gets CPU time, keeps files organised, and stops one program from breaking another. Without it, every application would have to manage the hardware itself.',
      'This lesson explains what the OS does, the boundary it draws between itself and your programs, and the relay race that runs every time you press the power button — from the first self-test to the desktop.',
    ],
    learn: [
      {
        heading: 'What the operating system actually does',
        body: [
          'The OS has five jobs: manage the CPU (who runs, and for how long), manage memory (who gets RAM, and what happens when it runs out), manage files (where they live and who may touch them), manage devices (printers, disks, network cards), and manage users (who is logged in and what they may do).',
          'Every application relies on those services instead of talking to the hardware directly. That is what makes software portable: the same program runs on different machines because the OS hides the differences between them.',
        ],
      },
      {
        heading: 'Kernel space and user space',
        body: [
          'The kernel is the part of the OS with full hardware access. Applications run in user space — restricted — and must ask the kernel for anything sensitive, through system calls. That boundary is the OS\'s safety net: a crashing application can be killed, but a crashing kernel takes the whole machine down.',
          'When a program reads a file, it does not touch the disk. It asks the kernel, the kernel checks permissions, reads the disk, and hands the data back. Every permission error, every "access denied", and every security boundary in the system lives on this split.',
        ],
      },
      {
        heading: 'Processes, threads, and virtual memory',
        body: [
          'A process is a running program with its own memory; a thread is a line of work inside a process, sharing that memory. A browser runs one process per tab, and each tab\'s threads share the tab\'s memory. Threads are cheap to start, but one thread\'s crash can take its whole process with it.',
          'Virtual memory is the OS\'s answer to running out of RAM: it pages the least-used data out to a swap file on disk, freeing RAM for what is needed now. It works — but slowly, because the disk is far slower than RAM. A machine that is constantly swapping feels sluggish for exactly this reason.',
        ],
      },
      {
        heading: 'From power button to desktop',
        body: [
          'Booting is a relay race. The firmware runs POST — the Power-On Self-Test — checking that the CPU, memory, and key devices respond. Then it finds the boot device and runs the bootloader: BOOTMGR on Windows, GRUB on Linux. The bootloader loads the kernel, the kernel starts the services, and the login screen appears.',
          'The firmware is BIOS on old machines and UEFI on modern ones. UEFI is graphical, boots faster, handles large GPT disks, and supports Secure Boot — a check that refuses to run an unsigned bootloader, blocking rootkits that load before the operating system. The partition table matters too: MBR is limited to 2 TB disks and four primary partitions, while GPT supports huge disks, up to 128 partitions, and keeps backup copies with error checking.',
        ],
      },
    ],
    architecture: {
      caption: 'The boot sequence: each stage hands off to the next. A failure at any stage stops the machine there.',
      diagram: code(
        '  power on',
        '     |',
        '  POST — firmware checks CPU, RAM, devices',
        '     |',
        '  firmware finds the boot device (UEFI / BIOS)',
        '     |',
        '  bootloader loads the kernel  (BOOTMGR / GRUB)',
        '     |',
        '  kernel starts services, drivers, login screen',
        '     |',
        '  desktop',
      ),
    },
    cheatSheet: [
      ['Operating system', 'Manages hardware, memory, files, processes, and users.'],
      ['Kernel', 'The OS core with full hardware access; apps must ask it.'],
      ['Process', 'A running program with its own isolated memory.'],
      ['Thread', 'A line of work inside a process, sharing its memory.'],
      ['Virtual memory', 'Disk space used to extend RAM when memory runs short.'],
      ['BIOS', 'The legacy firmware interface; replaced by UEFI.'],
      ['UEFI', 'Modern firmware: graphical, fast, GPT, Secure Boot.'],
      ['Bootloader', 'Loads the kernel into memory — BOOTMGR or GRUB.'],
    ],
  },
  'it-files-cli': {
    overview: [
      'Files are the unit of work in IT. Everything you do — writing a report, fixing a server, shipping code — is creating, moving, reading, or deleting files. The file system is the map that organises them, and the command line is the fastest way to work with them.',
      'This lesson covers the file systems you will meet, how paths and names work, the extension trap that catches beginners, and the command line — the text interface that every server, and every later course, assumes you can use.',
    ],
    learn: [
      {
        heading: 'File systems: NTFS, ext4, FAT32, exFAT',
        body: [
          'A file system is the structure written on a volume so the operating system can store and find files. NTFS is the Windows default: it tracks who may read or change each file, journals changes so a crash does not corrupt the volume, and supports files far larger than 4 GB. ext4 is the Linux default, with the same journaling and large-file support, built for Linux permissions.',
          'FAT32 is universal — every operating system can read it — but a single file cannot exceed 4 GB and it has no permissions, so it survives on USB sticks and cameras. exFAT is the middle ground for removable media: cross-platform like FAT32, without the 4 GB cap, but with no journaling or permissions either. Choose by the job: NTFS or ext4 for system drives, exFAT for a flash drive that must work everywhere.',
        ],
      },
      {
        heading: 'Paths, names, and the extension trap',
        body: [
          'A path is an address. An absolute path starts at the root — C:\\Users\\Sam\\report.pdf or /home/sam/report.pdf — and works from anywhere. A relative path starts at the current directory: ../report.pdf means "one folder up from where I am now." Knowing where you are is half of working with files.',
          'Names have traps. On Linux, Report.txt and report.txt are different files — file names are case-sensitive — while Windows and macOS usually treat them as one. And Windows hides known extensions by default, so invoice.pdf.exe looks like a harmless PDF while actually being a program. Showing extensions is a basic security habit.',
        ],
      },
      {
        heading: 'The command line',
        body: [
          'The command line (CLI) is a text interface: you type a command, the shell runs it and answers. There are no buttons or windows, but there is also no ambiguity — the same command does the same thing every time, which makes it fast for repetitive work and easy to automate. It is the native language of servers, and every later course assumes you can use it.',
          'The shell is the program that reads your commands: Bash on Linux, CMD and PowerShell on Windows. A few commands cover most daily work: cd changes directory, ls lists files, mkdir makes a directory, and cat prints a file. Learn those four and you can navigate any system; the rest is vocabulary you pick up as you go.',
        ],
      },
      {
        heading: 'Buffers and caches',
        body: [
          'Two ideas keep data moving fast, and they are easy to confuse. A buffer holds data while a slower device catches up — it smooths the speed gap between a producer and a consumer, like a reservoir between two pipes. A cache keeps recently used data in fast memory so the next request is answered instantly — it is about reuse, not timing.',
          'Both appear everywhere: the OS buffers disk writes, the CPU caches memory, the browser caches pages. When something is slow, the first question is usually which one is missing or full.',
        ],
      },
    ],
    examples: [
      {
        title: 'Finding your way around',
        code: code(
          'pwd            # print the current directory',
          'ls -la         # list all files, with details',
          'cd Documents   # move into Documents',
          'cd ..          # move up one level',
          'cd ~           # go home',
        ),
        explanation: 'Knowing where you are is the first step — pwd tells you, ls shows you what is there, cd moves you.',
      },
      {
        title: 'Working with files',
        code: code(
          'mkdir notes     # make a new directory',
          'cat todo.txt    # print a file to the screen',
          'cp todo.txt backup.txt   # copy a file',
          'mv todo.txt done.txt     # rename (move) a file',
          'rm old.txt      # delete a file — no recycle bin',
        ),
        explanation: 'These five commands cover most file work. Note that rm deletes immediately: there is no undo.',
      },
    ],
    cheatSheet: [
      ['File system', 'The structure on a volume that organises files — NTFS, ext4, FAT32, exFAT.'],
      ['NTFS', 'Windows default: permissions, journaling, large files.'],
      ['ext4', 'Linux default: journaled, reliable, built for Linux permissions.'],
      ['FAT32', 'Universal, but 4 GB file limit and no permissions.'],
      ['Absolute path', 'Starts at the root — works from anywhere.'],
      ['Relative path', 'Starts at the current directory — depends on where you are.'],
      ['Shell', 'The program that reads CLI commands — Bash, CMD, PowerShell.'],
      ['CLI', 'Command-line interface: type commands, get answers, automate everything.'],
    ],
  },
};
