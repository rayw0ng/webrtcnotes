# install
debian
```sh
apt install coturn
```
arch
```sh
pacman -S coturn
```
# configuration
edit `/etc/default/coturn` 
```
TURNSERVER_ENABLED=1
```
edit `/etc/turnserver.conf` 
```
# long term credentials mechanism
lt-cred-mech
user=username1:password1
```
then start the service
```sh
sudo systemctl enable coturn
sudo systemctl start coturn
```
## use userdb
edit `/etc/turnserver.conf` 
```sh
userdb=/var/lib/turn/turndb
realm=realm1
```
then add user with `turnadmin -a -u username -p password -r realm1`
# test
## turn server
run `turnutils_peer` on the server, then run
```sh
turnutils_uclient  -u 'user' -w 'password' server_ip -e server_ip -v
```
on the client.
## stun server
```sh
turnutils_natdiscovery -m -f server_ip
```
