class uTorrentApi extends BaseClient {

    constructor(serverOptions) {
        super();

        this.options = serverOptions;
        this.cookie = null;
        this.token = null;
    }

    logIn() {
        const {hostname} = this.options;

        this._attachListeners();

        return new Promise((resolve, reject) => {
            fetch(hostname + 'token.html', {
                method: 'GET'
            })
            .then((response) => {
                if (response.ok)
                    return response.text()
                else if (response.status === 401)
                    throw new Error(browser.i18n.getMessage('loginError'));
                else
                    throw new Error(browser.i18n.getMessage('apiError', response.status.toString() + ': ' + response.statusText));
            })
            .then((html) => {
                const token = html.match(/<div.+?>(.+?)<\/div>/);

                if (token && token[1]) {
                    this.token = token[1];
                    resolve();
                }
                else {
                    throw new Error(browser.i18n.getMessage('apiError', html));
                }
            })
            .catch((error) => reject(error));
        });
    }

    logOut() {
        this.removeEventListeners();

        this.cookie = null;
        this.token = null;

        return Promise.resolve();
    }

    addTorrent(torrent) {
        const {hostname} = this.options;
        const token = this.token;

        return new Promise((resolve, reject) => {
            let form = new FormData();
            form.append('torrent_file', torrent, 'temp.torrent');

            fetch(hostname + '?token=' + token + '&action=add-file', {
                method: 'POST',
                body: form
            })
            .then((response) => response.json())
            .then((json) => {
                if (!json.error)
                    resolve();
                else
                    throw new Error(browser.i18n.getMessage('torrentAddError'));
            }).catch((error) => reject(error));
        });
    }

    addTorrentUrl(url) {
        const {hostname} = this.options;
        const token = this.token;

        return new Promise((resolve, reject) => {
            fetch(hostname + '?token=' + token + '&action=add-url&s=' + encodeURIComponent(url), {
                method: 'GET'
            })
            .then((response) => response.json())
            .then((json) => {
                if (!json.error)
                    resolve();
                else
                    throw new Error(browser.i18n.getMessage('torrentAddError'));
            })
            .catch((error) => reject(error));
        });
    }

    _attachListeners() {
        const {hostname, username, password} = this.options;
        let sessionCookie = this.cookie;

        this.addHeadersReceivedEventListener((details) => {
            const cookie = details.responseHeaders.find((header) => header.name.toLowerCase() === 'set-cookie');

            if (cookie)
                sessionCookie = cookie.value.match(/GUID=(.+?);/)[0];
        });

        this.addBeforeSendHeadersEventListener((details) => {
            let requestHeaders = details.requestHeaders;

            requestHeaders = requestHeaders.filter((header) => {
                return ![
                    'authorization',
                    'cookie',
                ].includes(header.name.toLowerCase());
            });

            requestHeaders.push({
                name: 'Authorization',
                value: 'Basic ' + btoa(username + ':' + password)
            });

            if (sessionCookie) {
                requestHeaders.push({
                    name: 'Cookie',
                    value: sessionCookie
                });
            }

            return {
                requestHeaders: requestHeaders
            };
        });
    }

}
