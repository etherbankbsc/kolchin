"use strict";
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

let web3Modal
let provider;
let selectedAccount;

function init() {
      
    let user_account = localStorage.getItem('user_account');
    let user_session = localStorage.getItem('user_session');


    if(user_account != null) {
        if(user_session != null){
            let timestamp = Date.now();
            let dif = timestamp - parseInt(user_session);
            if(dif > 60000){
                localStorage.clear();
            } else {
                let user_tkns = localStorage.getItem('user_tkns')
                let user_rewards = localStorage.getItem('user_rewards')
                document.querySelector("#hold").textContent = user_tkns;
                document.querySelector("#btn_connect").style.display = "none";
                document.querySelector("#btn_disconnect").style.display = "block";
                let els = document.querySelectorAll("#hold_perc");
                [].forEach.call(els, function(div) {
                    div.textContent = user_rewards
                });
            }
        }
    }

    if (location.protocol !== 'https:') {
        document.querySelector("#btn_connect").setAttribute("disabled", "disabled")
        return;
    }

    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                infuraId: "7f6f5e5f062f7991492c0730e7dc45ef",
            }
        },

        fortmatic: {
            package: Fortmatic,
            options: {
                key: "pk_test_391E26A3B43A3350"
            }
        }
    };
    console.log(providerOptions);
    web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions,
        disableInjectedProvider: false,
    });

    console.log("Web3Modal instance is", web3Modal);
}

async function fetchAccountData() {

    const web3 = new Web3(provider);

    console.log("Web3 instance is", web3);

    const chainId = await web3.eth.getChainId();
    const chainData = evmChains.getChain(chainId);
    const accounts = await web3.eth.getAccounts();

    selectedAccount = accounts[0];


    const template = document.querySelector("#template-balance");
    const accountContainer = document.querySelector("#accounts");
    const rowResolvers = accounts.map(async (address) => {

        let contract = 'your_contract';

        const balance = await web3.eth.getBalance(address);
        let url = 'https://api.etherscan.io/api?module=account&action=tokentx&contractaddress='+contract+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=DFIFIFBPQMM5CK9YEZAMJ7AUTQTIMS1PI4';
        let url2 = 'https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress='+contract+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=DFIFIFBPQMM5CK9YEZAMJ7AUTQTIMS1PI4';
        let twinTimestamp = await makeRequest("GET", url);
        var twinTimestampObj = JSON.parse(twinTimestamp);

        localStorage.setItem('user_account', address);
        if (twinTimestampObj.result.length > 0) {
            let twinBalance = await makeRequest("GET", url2);
            var twinBalanceObj = JSON.parse(twinBalance);

            const twinTime = twinTimestampObj.result[0].timeStamp;
            let tst = Web3.utils.fromWei(twinBalanceObj.result, 'gwei');
            const twinBalan = tst.substr(0, tst.length - 9);
            var timeInMs = Date.now();
            var from = 0;
            var to = timeInMs.toString().length - 3;
            var newstr = timeInMs.toString().substring(from, to);
            const rewards = (newstr - twinTime) * (twinBalan / 100 * 0.0000148809);
            localStorage.setItem('user_tkns', parseFloat(twinBalan).toFixed(4));
            localStorage.setItem('user_rewards', parseFloat(rewards).toFixed(4));
            localStorage.setItem('user_session', Date.now());
            document.querySelector("#hold").textContent = parseFloat(twinBalan).toFixed(3);
            let els = document.querySelectorAll("#hold_perc");
                [].forEach.call(els, function(div) {
                    div.textContent = parseFloat(rewards).toFixed(3);
                });
        }

        const ethBalance = web3.utils.fromWei(balance, "ether");
        const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);

    });

    await Promise.all(rowResolvers);
    document.querySelector("#btn_connect").style.display = "none";
    document.querySelector("#btn_disconnect").style.display = "block";

}


function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

async function refreshAccountData() {


    document.querySelector("#btn_connect").setAttribute("disabled", "disabled")
    await fetchAccountData(provider)
    console.log('PROVIDE CONNECT', provider);
    document.querySelector("#btn_connect").style.display = "none";
    document.querySelector("#btn_disconnect").style.display = "block";

}

async function onConnect() {

    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        console.log("Could not get a wallet connection", e);
        return;
    }
    provider.on("accountsChanged", (accounts) => {
        console.log(accounts);
        fetchAccountData();
    });
    provider.on("chainChanged", (chainId) => {
        fetchAccountData();
    });

    provider.on("networkChanged", (networkId) => {
        fetchAccountData();
    });

    await refreshAccountData();
}

async function onDisconnect() {

    console.log("Killing the wallet connection", provider);
    if (provider.close) {
        await provider.close();
        await web3Modal.clearCachedProvider();
        provider = null;
    }

    selectedAccount = null;

    document.querySelector("#prepare").style.display = "block";
    document.querySelector("#connected").style.display = "none";
    document.querySelector("#show_after_auth").style.display = "none";

}
window.addEventListener('load', async () => {
    init();
    document.querySelector("#btn_connect").addEventListener("click", onConnect);
    document.querySelector("#btn_disconnect").addEventListener("click", onDisconnect);

});
