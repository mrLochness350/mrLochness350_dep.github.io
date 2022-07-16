
# Initial Enumeration:

**Ip address: 10.129.74.158**


I started off with an nmap scan like every box, which returned the open ports and services on the box:
![nmap result](/docs/img/nmap_scan.png)
which gave me the following info:

|Open ports | Service | version|
|-----------|---------|----|
| 21| ftp| vsftpd 3.0.3|
| 22 | ssh | OpenSSH 8.2p1 Ubuntu|
| 80 | gunicorn | ? |

I also ran a gobuster but it didn't give me anything useful

Let's check out the webserver and see what we're dealing with:

# Exploring the webpage

![home page](/docs/img/homepage.png)

Well, right off the bat we can see a username; **Nathan**. 
Trying to log out doesn't do anything so let's look around some more.

There's an ip config tab, a network status tab and a "Security Snapshot"

* **ip config**
![ip page](/docs/img/ip_page.png)

The contents of this page are just the output of `ifconfig`, which doesn't give us any useful information


---
* **network status**
![network status page](/docs/img/netstat.png)
This page also gives us a command output, but this time for `netstat`, which also doesn't give us a lot of useful information because none of connections are really "suspicious".

---
* **Security Snapshot**
![Security Snapshot](/docs/img/pcap_page.png)
Now this one is interesting. A download button? a strange URL with a number that could indicate an index of something? 
Lets look at it:

pressing the download button lets us download a `.pcap` file that has a recording of the network traffic over the past 5 seconds. Nothing really interesting in it.

Hmm.. 
What if we change the path from `/data/2` to `/data/0`. It has to start counting somewhere right? Could it be an IDOR vulnerability [^1]?

Well that hunch was right because the `.pcap` file connected to it included credentials for the `ftp` server running on the box!

![creds](/docs/img/creds.png)
`nathan:Buck3tH4TF0RM3!`

# Getting a shell

The credentials are for ftp but what if Nathan reused the password for ssh? Let's try to connect with them:


![ssh](/docs/img/ssh.png)

It worked! we connected to the box via ssh!
Lets get the user flag and continue from there

![user.txt](/docs/img/user.png)

Running `sudo -l` tells us that we can't run any sudo commands on the box..

# Privilege Escalation

 Let's download linpeas [^2] onto the box to see what it'll find.
 
Woah there buckaroo! What do we have here?

![privesc](/docs/img/privesc.png)

A python3.8 binary with the `cap_setuid` Linux Capability? [^3]

Let's try to exploit it, since it's a SetUID binary due to the Linux Capability set it has.

I'll try to get a shell using the poc in the hacktricks page:
`/usr/bin/python3.8 -c 'import os; os.setuid(0); os.system("/bin/bash");'`

It worked! 

![root](/docs/img/root.png)

Let's get the root flag and finish the box:

![root flag](/docs/img/root_flag.png)


# Summary
To conclude, this box is a neat example of IDOR vulnerabilities and SetUID binary exploitation. Very nice box, I enjoyed it.  

Thank you [@InfoSecJack](https://twitter.com/InfoSecJack?s=20&t=RfKfo7KOE5ANk4hjItbaag) for the fun box,
And thank you for reading this blog post :)












---
### Footnotes
[^1]: https://book.hacktricks.xyz/pentesting-web/idor
[^2]: https://github.com/carlospolop/PEASS-ng/tree/master/linPEAS
[^3]: https://book.hacktricks.xyz/linux-hardening/privilege-escalation/linux-capabilities