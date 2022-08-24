ip: 10.129.1.116
creator: eks

# Initial Enumeration

nmap scan: 
![nmap](/docs/htb/hard_boxes/img/joker/joker_nmap.png)


i ran a udp scan as well just in case and it showed that ftp and tftp are open:
![[Pasted image 20220807212204.png]]

i tried to connect to the ftp but failed. however, i did manage to connect to the tftp server anonymously. 

(small sidenote: while trying to enumerate the server my friend sent me this video: <https://www.youtube.com/watch?v=P3ynj6w2tII> and i just wanted to share it with you people. now back to your regularly scheduled hacking)

since tftp doesn't have any sort of directory listing functionality, we can't enumerate files in it. however, we know that squid is running on the server... maybe we can get the config files for squid?
yep:
![[Pasted image 20220807213250.png]]

grepping for a password shows us there's a file called `/etc/squid/passwords`
let's see if i can get it

yep:
![[Pasted image 20220807213710.png]]

inside it we have a username and a hashed password:

`kalamari:$apr1$zyzBxQYW$pL360IoLQ5Yum5SLTph.l0`
it's an Apache apr1 hash. lets see if we hashcat can crack it:
well since my vm for some reason does not support hashcat, i ran it on another vm and managed to crack it overnight
![[hash.png]]

we got creds!:
`kalamari:ihateseafood`
kinda ironic lol

so after connecting to the proxy with the following command:
`url -v -x "http://kalamari:ihateseafood@10.129.1.116:3128" 127.0.0.1`
i saw it led to a custom url shortner called `shorty`. Running a dirbust on it showed a url called **/console** which is a python expression debugger using werkzeug.


![[Pasted image 20220807225328.png]] 
console.html

![[Pasted image 20220807225343.png]]
homepage

sending a post request to the shorty with a url throws a massive error that includes a secret: **"sWA1EQKqHGgdGjKkDpsL"**
![[Pasted image 20220807225514.png]]

so i proxied the page with the FoxyProxy firefox addon and checked the pages we saw yesterday.
I particularly focused on the /console area because it really made my brain happy. I followed [this](https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/werkzeug) hacktricks page and got code execution with the very first payload on the page:

![[Pasted image 20220808193832.png]]

after multiple failed attempts to get the box to connect back to me i checked the IP tables file to see what is going on:
![[Pasted image 20220809191306.png]]

after learning what these all mean i noticed that it accepts udp inbound and doesnt drop the outbound connections, meaning we can try to get a udp shell:

![[Pasted image 20220809192330.png]]
I used [this](https://github.com/infodox/python-pty-shells/blob/master/udp_pty_backconnect.py) shell to get my shell

looking at the sudo -l output  see we can run sudoedit as the alekos user for a specific file that we can probably privesc with via symlinks
![[Pasted image 20220809192942.png]]

i also checked the sudo version: `1.8.16` and also checked searchsploit. there weren't any vulnerabilities for that specific version but there was a vulnerability dubbed CVE-2015-5602 that fits just the right criteria: 

![[Pasted image 20220809195028.png]]

executing the exploit with a symlink to alekos' authorized keys file i pasted my public key and got an ssh shell as alekos, thus granting me the user flag

in the home directory we have a few folders: 
`backups` and `development`

inside backups there are backups of the development folder that occurs every 5 minutes
this might be a very very _wild_ assumption but i have a feeling that the command that zips the folder is using a wildcard in it's command, so it'll look something like this: `tar -cf * dev-blahblahblah`
so i looked at gtfobins, and  i could create a file called `--checkpoint=1` and `--checkpoint-action=exec=sh script.sh` and get root code execution

script.sh
```bash
#!/bin/bash

cat /root/root.txt > /home/alekos/flag.txt
chmod 777 /home/alekos/flag.txt

ls -la /root/ > /home/alekos/dir.txt
chmod 777 /home/alekos/dir.txt
```

and just like that, we completed the box! :)

there is another way that i read about after finishing the box, that says that changing the name of the directory will cause the tar command to break, thus actually zipping the contents of the root folder instead. Let's try:


![[Pasted image 20220809213120.png]]

as we can see, the zip made at 21:30 is significantly smaller than the one made at 21:25
![[Pasted image 20220809213040.png]]

and unzipping it shows us that we can get the flag that way:
![[Pasted image 20220809213359.png]]


