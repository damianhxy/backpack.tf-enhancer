// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Relists trades on Backpack.tf Classifieds
// @downloadURL         https://raw.githubusercontent.com/damianhxy/BP.TF-Auto-Relist/master/relist.user.js
// @grant               GM_xmlhttpRequest
// @include             /^https?:\/\/backpack\.tf.*/
// @name                Backpack.tf Classifieds AutoRelist
// @namespace           localhost
// @run-at              document-end
// @updateURL           https://raw.githubusercontent.com/damianhxy/BP.TF-Auto-Relist/master/relist.meta.js
// @version             1.4.2.2
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //(boolean) random reload time?
        randomRelist = 1,            //(boolean) random item relisted?
        defaultTime = 5,             //(minutes) default reload time
        randomMin = 1,               //(minutes) minimum random reload time
        randomMax = 10,              //(minutes) maximum random reload time
        updateFreq = 3,              //(days) currency price refresh frequency
        notes = "Pure/25% item overpay, exact ↯ offers are automatically accepted.";
    /******** END OF SETTINGS *******/

    var listPage = window.location.href.contains("/add");
    if (!listPage && !window.location.href.contains("profiles")) {
        var classifieds = document.getElementsByClassName("listing-remove")[0] && window.location.href.contains("?steamid="),
            firstPage = document.getElementsByClassName("fa-angle-left")[0].parentNode.parentNode.className === "disabled",
            lastPage = document.getElementsByClassName("fa-angle-right")[0].parentNode.parentNode.className === "disabled";
    }

    function addButton(prop, val, def) {
        var button = document.createElement("input");
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        button.setAttribute("style", "color: white; float: right; padding: 5px; margin-right: 5px; border-radius: 5px; border-color: black;" + "background-color: " + (JSON.parse(sessionStorage.getItem(prop)) ? "#628C2A;" : "#F15853;"));
        button.setAttribute("value", val);
        button.setAttribute("type", "button");
        button.setAttribute("onclick", "window.stop(); sessionStorage.setItem('" + prop + "', !JSON.parse(sessionStorage.getItem('" + prop + "'))); location.reload();");
        document.getElementById("#navbar").appendChild(button);
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = Math.round(num * 90) / 90;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        if (val.toFixed(2) % 1 >= 5 / 90)
            val -= 0.005;
        return +val.toFixed(2);
    }

    function update() {
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API Key not set, please enter below:"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Invalid API Key");
            localStorage.removeItem("apikey");
            update();
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
            onload: function(e) {
                var data = JSON.parse(e.response);
                if (!data)
                    alert("API Error: Received nothing");
                else if (data.response.message)
                    alert(data.response.message);
                var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                    bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                    k = key.value_high ? ((key.value + key.value_high) / 2) : key.value,
                    b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value;
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Updated, Key: " + k + ", Bud: " + b);
                    localStorage.setItem("lastupdt", new Date());
            }
        });
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime % 60;
            data.innerHTML = "Reloading classifieds in " + min + ":" + ("0" + sec).slice(-2);
            window.document.title = "Classifieds: " + min + ":" + ("0" + sec).slice(-2);
            reloadTime--;
        }
        else
            document.getElementsByClassName("fa-angle-double-left")[0].parentNode.click();
    }

    if (!localStorage.getItem("keyP") || !localStorage.getItem("budP"))
        update();
    else if (!localStorage.getItem("lastupdt") || (new Date() - localStorage.getItem("lastupdt") >= 86400 * updateFreq))
        update();

    if (window.location.href.contains("profiles")) {
        if (JSON.parse(sessionStorage.getItem("persistent"))) {
            if (window.location.href.contains("profiles") && JSON.parse(sessionStorage.getItem("persistent"))) {
                var listings = document.getElementsByClassName("dropdown-menu")[1].children[9].firstElementChild;
                if (listings.href.slice(-17) === window.location.href.slice(-17))
                    listings.click();
            }
        }
        else {
            setTimeout(function() {
                document.querySelectorAll("[href='#page0']")[0].innerHTML += " >" + (document.getElementById("newlist").children.length - 1);
            }, 1000)
            addButton("highlight", "Highlight", false);
            if (JSON.parse(sessionStorage.getItem("highlight"))) {
                var itms = document.getElementsByClassName("item trade"),
                    parted = 0,
                    painted = 0,
                    killstreak = 0,
                    unpriced = 0;
                for (var a = 0; a < itms.length; a++) {
                    if (itms[a].hasAttribute("data-paint-name")) {
                        itms[a].style.backgroundColor = "pink";
                        painted++;
                    }
                    if (itms[a].hasAttribute("data-part-1-name")) {
                        itms[a].style.backgroundColor = "lime";
                        parted++;
                    }
                    if (!+itms[a].getAttribute("data-price")) {
                        itms[a].style.backgroundColor = "grey";
                        unpriced++;
                    }
                    if (itms[a].hasAttribute("data-spell-1"))
                        itms[a].style.border = "4px #005EFF solid";
                    if (itms[a].hasAttribute("data-default-name")) {
                        var title = itms[a].getAttribute("data-default-name");
                        if (title.contains("Killstreak") && !title.contains("Kit")) {
                            itms[a].style.borderRadius = "25%";
                            killstreak++;
                        }
                    }
                    else {
                        var title = itms[a].getAttribute("title");
                        if (title.contains("Killstreak") && !title.contains("Kit")) {
                            itms[a].style.borderRadius = "25%";
                            killstreak++;
                        }
                    }

                }
                var note = document.createElement("small"),
                    panel = document.getElementsByClassName("panel-heading")[3];
                note.setAttribute("style", "color: orange;");
                note.innerHTML = " [Contains: " + killstreak + " killstreaked, " + parted + " parted, " + painted
                               + " painted & " + unpriced + " unpriced item(s)]";
                panel.insertBefore(note, panel.children[1]);
            }
        }
    }

    if (classifieds || listPage) {
        var keyP = +localStorage.getItem("keyP"),
            budP = +localStorage.getItem("budP");
        sessionStorage.curPage = sessionStorage.curPage || 1;
        addButton("paused", "Paused", false);
        addButton("persistent", "Persistent", false);
        if (JSON.parse(sessionStorage.getItem("paused"))) {
            window.document.title = "Classifieds: Paused";
            return;
        }
        if (classifieds) {
            if (firstPage && sessionStorage.getItem("curPage") > 2)
                window.location.href = window.location.href + "&page=" + sessionStorage.getItem("curPage");
            else {
                var button = document.getElementsByClassName("listing-relist");
                if (button.length)
                    button[randomRelist ? range(0, button.length - 1) : 0].click();
                else {
                    if (JSON.parse(sessionStorage.getItem("curPage")) === 1 && firstPage)
                        sessionStorage.setItem("curPage", 2);
                    else if (!firstPage)
                        sessionStorage.setItem("curPage", JSON.parse(sessionStorage.getItem("curPage")) + 1)
                    if (lastPage) {
                        sessionStorage.removeItem("curPage");
                        var data = document.createElement("small"),
                            reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                        data.setAttribute("style", "color: orange; float: right;");
                        document.getElementsByClassName("panel-heading")[0].appendChild(data);
                        setInterval(showStatus, 1000);
                    }
                    document.getElementsByClassName("fa-angle-right")[0].parentNode.click();
                }
            }
        }
        else if (listPage) {
            switch (document.getElementById("item-overview-name").firstElementChild.innerHTML) {
                case "Relisting this item":
                    document.getElementById("button_save").click();
                    break;
                case "Creating a new listing for this item":
                    var itm = document.getElementsByClassName("item")[0],
                        price = +itm.getAttribute("data-price");
                    if (!price || itm.getAttribute("title").contains("Killstreak")) {
                        document.getElementById("metal").previousElementSibling.innerHTML += " (Unpriced)";
                        if (itm.hasAttribute("data-market-p"))
                            price = +itm.getAttribute("data-market-p") / 249 * keyP;
                    }
                    else if (itm.getAttribute("data-p-bptf").contains("–"))
                        document.getElementById("metal").previousElementSibling.innerHTML += " (Ranged)";
                    if (price >= keyP * budP && !itm.getAttribute("data-name").contains("Earbuds")) {
                        document.getElementById("earbuds").value = Math.floor(price / (keyP * budP));
                        price %= keyP * budP;
                    }
                    if (price >= keyP && !itm.getAttribute("data-name").contains("Key")) {
                        document.getElementById("keys").value = Math.floor(price / keyP);
                        console.log(price + "%" + keyP + "=" + price%keyP);
                        price %= keyP;
                    }
                    price = round(price);
                    if (price)
                        document.getElementById("metal").value = price;
                    document.getElementById("details").value = notes;
                    break;
            }
        }
    }
    console.info("Script Loaded.");
}).call(this);