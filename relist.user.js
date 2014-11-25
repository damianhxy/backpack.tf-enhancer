// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://raw.githubusercontent.com/damianhxy/BP.TF-Auto-Relist/master/relist.user.js
// @grant               GM_xmlhttpRequest
// @include             /^http:\/\/backpack\.tf.*/
// @exclude             /^http:\/\/backpack\.tf\/api\/.*/
// @name                Backpack.tf Enhancer
// @namespace           localhost
// @noframes
// @run-at              document-end
// @version             1.4.8.4
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        randomRelist = 1,            //[boolean] random item relisted?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 1,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        experimental = 0,            //[boolean] activate experimental features?
        notes = localStorage.getItem("notes") || "Pure/25% item overpay, exact ↯ offers are automatically accepted.";
    /******** END OF SETTINGS *******/

    function addButton(prop, val, def) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            toggle = document.createElement("i"),
            text = document.createTextNode(" " + val),
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.setAttribute("style", "margin-right: 5px; width: 100px;");
        button.setAttribute("onclick", "window.stop(); sessionStorage.setItem('" + prop +
                            "', !JSON.parse(sessionStorage.getItem('" + prop + "'))); location.reload();");
        button.setAttribute("class", "btn btn-" + (activated ? "success" : "danger") + " btn-sm pull-right");
        toggle.setAttribute("class", "fa fa-toggle-" + (activated ? "on" : "off"));
        button.appendChild(toggle);
        button.appendChild(text);
        document.getElementById("#navbar").appendChild(button);
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function round(num) {
        var val = +num;
        if (num > 5 / 90)
            val = Math.floor(val) + (Math.round(val % 1 * 9)) / 9;
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
            document.querySelector(".fa-angle-double-left").parentNode.click();
    }

    function update() {
        if (document.getElementById("login"))
            console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        if (!localStorage.getItem("keyP") || !localStorage.getItem("budP")
            || (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey + "&compress=1",
                onload: function(e) {
                    var data = JSON.parse(e.response);
                    if (!data.response.success) {
                        if (data.response.message === "API key does not exist.") {
                            alert("Invalid API key");
                            localStorage.removeItem("apikey");
                            update();
                        }
                        else
                            alert("Error: " + data.response.message);
                    }
                    var key = data.response.items["Mann Co. Supply Crate Key"]["prices"][6]["Tradable"]["Craftable"][0],
                        bud = data.response.items["Earbuds"]["prices"][6]["Tradable"]["Craftable"][0],
                        k = (key.value + key.value_high || key.value) / 2,
                        b = (bud.value + bud.value_high || bud.value) / 2,
                        kDiff = " (" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                        bDiff = " (" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
                    localStorage.setItem("keyP", k);
                    localStorage.setItem("budP", b);
                    alert("Prices updated, Keys: " + k + " Refined" + kDiff + ", Earbuds: " + b + " Keys" + bDiff);
                    localStorage.setItem("lastupdt", new Date());
                }
            });
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
    }

    function HTTPRequest(URL) {
        var xmlhttp = new XMLHttpRequest(),
            ele = document.createElement("html");
        xmlhttp.open("GET", URL, false);
        xmlhttp.send();
        ele.innerHTML += xmlhttp.responseText;
        return ele;
    }

try {
    /******** SCRIPT GLOBALS ********/
    var listPage = window.location.href.contains("/add"),
        profile = window.location.href.contains("profiles"),
        listings = document.getElementsByClassName("listing-remove").length && window.location.href.contains("steamid="),
        isSelf = document.querySelector(".dropdown-btn").href === window.location.href,
        keyP = +localStorage.getItem("keyP"),
        budP = +localStorage.getItem("budP");
    update();
    /****** END SCRIPT GLOBALS ******/

    if (experimental) {
        if (window.location.href === "http://backpack.tf/") {
            addButton("restore", "Restore All", false);
            addButton("save", "Save All", false);
            addButton("delete", "Delete All", false);
            addButton("clear", "Clear Data", false);
            if (JSON.parse(sessionStorage.getItem("save"))) {
                document.querySelector("[href^='/classifieds/?steamid=']").click();
                return;
            }
        }
        if (JSON.parse(sessionStorage.getItem("restore"))) {
            if (window.location.href.contains("/add")) {
                var itm = Object.keys(localStorage).find(function(e) {
                    return e === "trdata-" + document.querySelector(".item").getAttribute("data-id");
                }),
                    arr = localStorage.getItem(itm).split("$");
                document.getElementById("metal").value = arr[0];
                document.getElementById("keys").value = arr[1];
                document.getElementById("earbuds").value = arr[2];
                document.getElementById("details").value = arr[3];
                localStorage.removeItem(itm);
                document.getElementById("button_save").click();
                return;
            }
            else {
                var stored = Object.keys(localStorage).filter(function(e) {
                    return e.startsWith("trdata-");
                });
                if (stored.length)
                    location.assign("http://backpack.tf/classifieds/add/" + stored[range(0, stored.length - 1)].slice(7));
                else {
                    alert("Classifieds Restored!");
                    sessionStorage.setItem("restore", false);
                    document.querySelector(".navbar-brand").click();
                }
                return;
            }
        }
        else if (JSON.parse(sessionStorage.getItem("delete"))) {
            if (!listings)
                document.querySelector("[href^='/classifieds/?steamid=']").click();
            else {
                var remove = document.getElementsByClassName("listing-remove");
                if (remove.length) {
                    Array.prototype.forEach.call(remove, function(e) {
                        e.click();
                        e.click();
                    });
                    location.reload();
                }
                else {
                    alert("Listings Deleted!");
                    sessionStorage.setItem("delete", false);
                    document.querySelector(".navbar-brand").click();
                }
                return;
            }
        }
        else if (JSON.parse(sessionStorage.getItem("clear"))) {
            var stored = Object.keys(localStorage).filter(function(e) {
                return e.startsWith("trdata-");
            });
            stored.forEach(function(e) {
                localStorage.removeItem(e);
            });
            alert("Savedata Cleared!");
            sessionStorage.setItem("clear", false);
            location.reload();
        }
        else if (JSON.parse(sessionStorage.getItem("save"))) {
            if (!listings)
                document.querySelector("[href^='/classifieds/?steamid=']").click();
            else {
                var itms = document.getElementsByClassName("item");
                Array.prototype.forEach.call(itms, function(e) {
                    var itm = e.getAttribute("data-id"),
                        price = e.getAttribute("data-listing-price").split(" "),
                        metal = price[price.length - 2],
                        key = price[price.length - 4] || 0,
                        bud = price[price.length - 6] || 0,
                        note = e.getAttribute("data-listing-comment");
                    localStorage.setItem("trdata-" + itm, [metal, key, bud, note].join("$"));
                });
                if (document.querySelector(".pagination-filters").lastElementChild.className !== "disabled")
                    document.querySelector(".fa-angle-right").click();
                else {
                    alert("Listings Data Saved!");
                    sessionStorage.setItem("save", false);
                    document.querySelector(".navbar-brand").click();
                }
                return;
            }
        }
    }

    if (profile) {
        if (JSON.parse(sessionStorage.getItem("persistent")) && isSelf)
            document.querySelector("[href^='/classifieds/?steamid=']").click();
        else {
            setTimeout(function() {
                document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                         document.getElementById("newlist").children.length - 1 + " ");
            }, 1000);
            addButton("annotate", "Annotate", false);
            if (isSelf) {
                addButton("fastlist", "Fast Listing", false);
                if (JSON.parse(sessionStorage.getItem("fastlist"))) {
                    Array.prototype.forEach.call(document.getElementsByClassName("item trade"), function(e) {
                        if (!e.getAttribute("data-name").contains("Metal")) {
                            var style = e.hasAttribute("data-listing-price") ? "fa-refresh" : "fa-plus-square",
                                html = "<a href='http://backpack.tf/classifieds/add/" + e.getAttribute("data-id") +
                                       "'>" + "<i class='fa " + style + " fa-inverse fa-border'" +
                                       " style='position: absolute; bottom: 2px; left: 2px;'></i></a>";
                            e.firstElementChild.insertAdjacentHTML("beforeend", html);
                        }
                        if (e.hasAttribute("data-gifted-name")) {
                            e.querySelector(".fa-gift").style.display = "none";
                            e.firstElementChild.insertAdjacentHTML("beforeend", "<i class='fa fa-gift fa-inverse" +
                                                                   " fa-border pull-left'></i>");
                        }
                    });
                }
            }
            if (JSON.parse(sessionStorage.getItem("annotate"))) {
                Array.prototype.forEach.call(document.getElementsByClassName("value"), function(e) {
                    if (!e.parentNode.parentNode.hasAttribute("data-crate")) {
                        if (+e.textContent.split("#")[1] <= 100)
                            e.insertAdjacentHTML("afterend", "<i class='fa fa-exclamation-triangle fa-inverse fa-border" +
                                                             " pull-left'>" + e.textContent + "</i>");
                        e.style.display = "none";
                    }
                });
                Array.prototype.forEach.call(document.getElementsByClassName("item trade"), function(e) {
                    var box = e.firstElementChild;
                    if (e.hasAttribute("data-paint-name")) {
                        if (e.getAttribute("data-paint-name") !== e.getAttribute("data-name"))
                            box.insertAdjacentHTML("beforeend", "<i class='fa fa-paint-brush fa-inverse fa-border" +
                                                   " pull-left'></i>");
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
                        box.insertAdjacentHTML("beforeend", "<i class='fa fa-bomb fa-border pull-left'" +
                                               " style='color: " + colour + "; background-color: white'></i>");
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
            console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
            return;
        }
    }

    if (listings) {
        var first = document.querySelector(".pagination-filters").firstElementChild.className === "disabled",
            last = document.querySelector(".pagination-filters").lastElementChild.className === "disabled",
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
                document.querySelector(".panel-heading").appendChild(data);
                setInterval(showStatus, 1000);
            }
            else {
                if (!first || (first && JSON.parse(sessionStorage.getItem("curPage")) === 1))
                    sessionStorage.setItem("curPage", JSON.parse(sessionStorage.getItem("curPage")) + 1);
                document.querySelector(".fa-angle-right").click();
            }
        }
    }
    else if (listPage) {
        switch (document.getElementById("item-overview-name").firstElementChild.innerHTML) {
            case "Relisting this item":
                document.getElementById("button_save").click();
                break;
            case "Creating a new listing for this item":
                var itm = document.querySelector(".item"),
                    price = +itm.getAttribute("data-price"),
                    name = itm.getAttribute("data-name"),
                    title = itm.getAttribute("data-title") || "";
                if (!price || title.contains("Killstreak")) {
                    document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Unpriced)");
                    if (itm.hasAttribute("data-market-p"))
                        price = +itm.getAttribute("data-market-p") / 249 * keyP;
                }
                else if (itm.getAttribute("data-p-bptf").contains("–"))
                    document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Ranged)");
                if (price >= keyP && !name.contains("Key")) {
                    if (price >= keyP * budP && !name.contains("Earbuds")) {
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
                    document.getElementById("metal").value = price;
                document.getElementById("details").value = notes;

                var quality = +itm.getAttribute("data-quality"),
                    tradable = +itm.getAttribute("data-tradable"),
                    craftable = +itm.getAttribute("data-craftable"),
                    isAust = itm.hasAttribute("data-australium"),
                    isKS = title.contains("Killstreak") && !title.contains("Kit"),
                    hasPaint = itm.hasAttribute("data-paint-name"),
                    colour,
                    tier;
                if (hasPaint) {
                    var paint = {
                        "A Color Similar to Slate": "3100495",
                        "A Deep Commitment to Purple": "8208497",
                        "A Distinctive Lack of Hue": "1315860",
                        "A Mann's Mint": "12377523",
                        "After Eight": "2960676",
                        "Aged Moustache Grey": "8289918",
                        "An Air of Debonair": "6637376",
                        "An Extraordinary Abundance of Tinge": "15132390",
                        "Australium Gold": "15185211",
                        "Balaclavas Are Forever": "3874595",
                        "Color No. 216-190-216": "14204632",
                        "Cream Spirit": "12807213",
                        "Dark Salmon Injustice": "15308410",
                        "Drably Olive": "8421376",
                        "Indubitably Green": "7511618",
                        "Mann Co. Orange": "13595446",
                        "Muskelmannbraun": "10843461",
                        "Noble Hatter's Violet": "5322826",
                        "Operator's Overalls": "4732984",
                        "Peculiarly Drab Tincture": "12955537",
                        "Pink as Hell": "16738740",
                        "Radigan Conagher Brown": "6901050",
                        "Team Spirit": "12073019",
                        "The Bitter Taste of Defeat and Lime": "3329330",
                        "The Color of a Gentlemann's Business Pants": "15787660",
                        "The Value of Teamwork": "8400928",
                        "Waterlogged Lab Coat": "11049612",
                        "Ye Olde Rustic Colour": "8154199",
                        "Zepheniah's Greed": "4345659"
                    },
                    colour = paint[itm.getAttribute("data-paint-name")];
                }
                if (isKS) {
                    if (title.contains("Professional"))
                        tier = 3;
                    else if (title.contains("Specialized"))
                        tier = 2;
                    else
                        tier = 1;
                }
                var url,
                    heading = document.getElementsByClassName("panel-heading")[1];
                if (title.contains("Kit"))
                    heading.textContent += " (Killstreak Kits & Fabricators not supported)";
                else {
                    if (!isKS && !hasPaint)
                        url = "http://backpack.tf/stats/" + itm.getAttribute("data-q-name") + "/" + name + "/" +
                              (tradable ? "" : "Non-") + "Tradable" + "/" + (craftable ? "" : "Non-") + "Craftable";
                    else
                        url = "http://backpack.tf/classifieds/?item=" + (isAust ? name.slice(11) : name) +
                                  "&quality=" + quality + "&tradable=" + tradable + "&craftable=" + craftable +
                                  (isAust ? "&australium=1" : "") + (isKS ? "&killstreak_tier=" + tier: "") +
                                  (hasPaint ? "&paint=" + colour : "");
                    var ele = HTTPRequest(url),
                        list = ele.querySelector(".media-list").children;
                    if (list.length) {
                        var lowest = list[0].querySelector(".item").getAttribute("data-listing-price"),
                            highest = list[list.length - 1].querySelector(".item").getAttribute("data-listing-price");
                        heading.textContent += " (Lowest: " + lowest + ", Highest: " + highest + ")";
                    }
                    else
                        heading.textContent += " (No other listings found)";
                }

        }
    }
    console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
}
catch(e) {
    alert("[An error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
}
})();