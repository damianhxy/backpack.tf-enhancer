// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Relists trades on Backpack.tf Classifieds
// @downloadURL         https://raw.githubusercontent.com/damianhxy/BP.TF-Auto-Relist/master/relist.user.js
// @grant               GM_xmlhttpRequest
// @include             /^https?:\/\/backpack\.tf.*/
// @exclude             /^https?:\/\/backpack\.tf\/api\/.*/
// @name                Backpack.tf Classifieds AutoRelist
// @namespace           localhost
// @run-at              document-end
// @version             1.4.6.8
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        randomRelist = 1,            //[boolean] random item relisted?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 1,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        notes = localStorage.getItem("notes") || "Pure/25% item overpay, exact ↯ offers are automatically accepted.";
    /******** END OF SETTINGS *******/

    //FUNCTION DECLARATIONS
    function addButton(prop, val, def) {
        var button = document.createElement("a"),
            toggle = document.createElement("i"),
            text = document.createTextNode(" " + val);
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        button.setAttribute("style", "margin-right: 5px; width: 100px;");
        button.setAttribute("onclick", "window.stop(); sessionStorage.setItem('" + prop + "', !JSON.parse(sessionStorage.getItem('" + prop + "'))); location.reload();");
        button.setAttribute("class", "btn btn-success btn-sm pull-right");
        toggle.setAttribute("class", "fa fa-toggle-" + (JSON.parse(sessionStorage.getItem(prop)) ? "on" : "off"));
        button.appendChild(toggle);
        button.appendChild(text);
        document.getElementById("#navbar").appendChild(button);
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function round(num) {
        var val;
        if (num <= 5 / 90)
            val = +num;
        else
            val = Math.floor(num) + (Math.round(num % 1 * 9)) / 9;
        return val;
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

    function update() {
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register one from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        if (!localStorage.getItem("keyP") || !localStorage.getItem("budP") || (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
                onload: function(e) {
                    var data = JSON.parse(e.response);
                    if (!data)
                        alert("Error: API returned empty response");
                    else if (!data.response.success) {
                        if (data.response.message === "API key does not exist.") {
                            alert("Invalid API key");
                            localStorage.removeItem("apikey");
                            update();
                        }
                        else
                            alert("Error occurred: " + data.response.message);
                    }
                    var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                        bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                        k = key.value_high ? ((key.value + key.value_high) / 2) : key.value,
                        b = bud.value_high ? ((bud.value + bud.value_high) / 2) : bud.value,
                        kOld = +localStorage.getItem("keyP"),
                        bOld = +localStorage.getItem("budP"),
                        kChange = " (" + (k === kOld ? "=" : (k < kOld ? "↓" : "↑")) + ")",
                        bChange = " (" + (b === bOld ? "=" : (b < bOld ? "↓" : "↑")) + ")";
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Prices updated, Keys: " + k + " Refined" + kChange + ", Earbuds: " + b + " Keys" + bChange);
                    localStorage.setItem("lastupdt", new Date());
                }
            });
            location.reload();
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
    }

    //START OF SCRIPT
try {
    /******** SCRIPT GLOBALS ********/
    update();
    var listPage = window.location.href.contains("/add"),
        profile = window.location.href.contains("profiles"),
        listings = document.getElementsByClassName("listing-remove").length && window.location.href.contains("steamid="),
        isSelf = document.getElementsByClassName("dropdown-btn")[0].href === window.location.href,
        keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP");
    /****** END SCRIPT GLOBALS ******/

    if (profile) {
        if (JSON.parse(sessionStorage.getItem("persistent")) && isSelf)
            document.getElementsByClassName("dropdown-menu")[1].children[9].firstElementChild.click();
        else {
            setTimeout(function() {
                var head = document.querySelectorAll("[href='#page0']")[0];
                head.insertAdjacentHTML('afterbegin', document.getElementById("newlist").children.length - 1 + " ");
            }, 1000);
            addButton("annotate", "Annotate", false);
            if (isSelf) {
                addButton("fastlist", "Fast Listing", false);
                if (JSON.parse(sessionStorage.getItem("fastlist"))) {
                    Array.prototype.forEach.call(document.getElementsByClassName("item trade"), function(e) {
                        if (!e.getAttribute("data-name").contains("Metal")) {
                            var style = e.hasAttribute("data-listing-price") ? "fa-refresh" : "fa-plus-square",
                                html = "<a href='http://backpack.tf/classifieds/add/" + e.getAttribute("data-id") +
                                       "'>" + "<i class='fa " + style + " fa-inverse fa-border' " +
                                       "style='position: absolute; bottom: 2px; left: 2px;'></i></a>";
                            e.firstElementChild.insertAdjacentHTML("beforeend", html);
                        }
                    });
                }
            }
            if (JSON.parse(sessionStorage.getItem("annotate"))) {
                Array.prototype.forEach.call(document.getElementsByClassName("value"), function(e) {
                    if (!e.parentNode.parentNode.hasAttribute("data-crate")) {
                        if (+e.textContent.split("#")[1] <= 100) {
                            e.insertAdjacentHTML("afterend", "<i class='fa fa-exclamation-triangle fa-inverse fa-border" +
                                                             " pull-left'>" + e.textContent + "</i>");
                            e.style.display = "none";
                        }
                    }
                });
                Array.prototype.forEach.call(document.getElementsByClassName("item trade"), function(e) {
                    var box = e.firstElementChild;
                    if (e.hasAttribute("data-paint-name")) {
                        if (e.getAttribute("data-paint-name") !== e.getAttribute("data-name"))
                            box.insertAdjacentHTML("beforeend", "<i class='fa fa-paint-brush fa-inverse fa-border " +
                                                   "pull-left'></i>");
                    }
                    if (e.hasAttribute("data-part-1-name"))
                        box.insertAdjacentHTML("beforeend", "<i class='fa fa-cogs fa-inverse fa-border pull-left'></i>");
                    if (e.hasAttribute("data-spell-1"))
                        box.insertAdjacentHTML("beforeend", "<i class='fa fa-magic fa-inverse fa-border pull-left'></i>");
                    var title = e.getAttribute("data-default-name") || e.getAttribute("title");
                    if (title.contains("Killstreak")) {
                        var colour;
                        if (title.contains("Professional"))
                            colour = "#ffd700";
                        else if (title.contains("Specialized"))
                            colour = "#c0c0c0";
                        else
                            colour = "#cd7f32";
                        box.insertAdjacentHTML("beforeend", "<i class='fa fa-bomb fa-border pull-left' " +
                                               "style='color: " + colour + "; background-color: white'></i>");
                    }
                });
            }
        }
    }

    if (listings || listPage) {
        sessionStorage.setItem("curPage", sessionStorage.getItem("curPage") || 1);
        addButton("paused", "Paused", false);
        addButton("persistent", "Persistent", false);
        if (JSON.parse(sessionStorage.getItem("paused"))) {
            window.document.title = "Classifieds: Paused";
            return;
        }
    }

    if (listings) {
        var first = document.getElementsByClassName("fa-angle-left")[0].parentNode.parentNode.className === "disabled",
            last = document.getElementsByClassName("fa-angle-right")[0].parentNode.parentNode.className === "disabled",
            buttons = document.getElementsByClassName("listing-relist");
        if (first && sessionStorage.getItem("curPage") > 2)
            location.assign(window.location.href + "&page=" + sessionStorage.getItem("curPage"));
        else if (buttons.length)
            buttons[randomRelist ? range(0, buttons.length - 1) : 0].click();
        else {
            if (last) {
                sessionStorage.removeItem("curPage");
                var data = document.createElement("small"),
                    reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                data.setAttribute("style", "color: orange; float: right;");
                document.getElementsByClassName("panel-heading")[0].appendChild(data);
                setInterval(showStatus, 1000);
            }
            else if (!first || (first && JSON.parse(sessionStorage.getItem("curPage")) === 1))
                sessionStorage.setItem("curPage", JSON.parse(sessionStorage.getItem("curPage")) + 1);
            document.getElementsByClassName("fa-angle-right")[0].parentNode.click();
        }
    }
    else if (listPage) {
        switch (document.getElementById("item-overview-name").firstElementChild.innerHTML) {
            case "Relisting this item":
                document.getElementById("button_save").click();
                break;
            case "Creating a new listing for this item":
                var itm = document.getElementsByClassName("item")[0],
                    price = +itm.getAttribute("data-price"),
                    metal = document.getElementById("metal");
                if (!price || itm.getAttribute("title").contains("Killstreak")) {
                    metal.previousElementSibling.insertAdjacentHTML("beforeend", " (Unpriced)");
                    if (itm.hasAttribute("data-market-p"))
                        price = +itm.getAttribute("data-market-p") / 249 * keyP;
                }
                else if (itm.getAttribute("data-p-bptf").contains("–"))
                    metal.previousElementSibling.insertAdjacentHTML("beforeend", " (Ranged)");
                if (price >= keyP && !itm.getAttribute("data-name").contains("Key")) {
                    if (price >= keyP * budP && !itm.getAttribute("data-name").contains("Earbuds")) {
                        document.getElementById("earbuds").value = Math.floor(price / (keyP * budP));
                        price %= keyP * budP;
                    }
                    document.getElementById("keys").value = Math.floor(price / keyP);
                    price %= keyP;
                }
                price = round(price);
                if (price * 100 % 1 >= 0.5)
                    price -= 0.005;
                price = +price.toFixed(2);
                if (price)
                    metal.value = price;
                document.getElementById("details").value = notes;
                break;
        }
    }
    console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
}
catch(e) {
    alert("[An error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
}
})();