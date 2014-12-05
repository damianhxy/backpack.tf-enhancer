// ==UserScript==
// @copyright           2014, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://github.com/damianhxy/BP.TF-Auto-Relist/raw/master/relist.user.js
// @grant               GM_xmlhttpRequest
// @include             /^http:\/\/backpack\.tf.*/
// @exclude             /^http:\/\/backpack\.tf\/api\/.*/
// @name                Backpack.tf Enhancer
// @namespace           localhost
// @noframes
// @run-at              document-end
// @version             1.5.1.4
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        randomRelist = 1,            //[boolean] random item relisted?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        preventMulThreads = 1,       //[boolean] prevent multiple threads?
        notes = localStorage.getItem("notes") || "Pure/25% item overpay, exact ↯ offers are automatically accepted.";
    /******** END OF SETTINGS *******/

    function addButton(prop, val, def) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            toggle = document.createElement("i"),
            text = document.createTextNode(" " + val),
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.style = "margin-right: 5px; width: 100px;";
        button.className = "btn btn-" + (activated ? "success" : "danger") + " btn-sm pull-right";
        button.addEventListener("click", function() {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        toggle.className = "fa fa-toggle-" + (activated ? "on" : "off");
        button.appendChild(toggle);
        button.appendChild(text);
        document.getElementById("#navbar").appendChild(button);
    }

    function HTTPRequest(URL) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", URL, false);
        xmlhttp.send();
        return xmlhttp.responseText;
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function round(num) {
        var val = +num;
        if (num > 5 / 90)
            val = Math.floor(val) + Math.round(val % 1 * 9) / 9;
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
            document.querySelector(".fa-angle-double-left").click();
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
        if (!localStorage.getItem("keyP") || !localStorage.getItem("budP") ||
            (new Date() - (Date.parse(localStorage.getItem("lastupdt")) || 0) >= 864e5 * updateFreq)) {
            var data = JSON.parse(HTTPRequest("http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.apikey));
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
                k = (key.value + (key.value_high || key.value)) / 2,
                b = (bud.value + (bud.value_high || bud.value)) / 2,
                kDiff = " (" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                bDiff = " (" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
            localStorage.setItem("keyP", k);
            localStorage.setItem("budP", b);
            alert("Prices updated, Keys: " + k + " Refined" + kDiff + ", Earbuds: " + b + " Keys" + bDiff);
            localStorage.setItem("lastupdt", new Date());
            location.reload();
            return;
        }
        var diff = 864e5 * updateFreq - (new Date() - Date.parse(localStorage.getItem("lastupdt"))),
            days = Math.floor(diff / 864e5),
            hours = Math.floor((diff % 864e5) / 36e5),
            minutes = Math.floor((diff % 36e5) / 6e4);
        console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
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

    if (profile || listings || listPage) {
        var stat = document.createElement("div");
        stat.style = "margin-left: 5px;";
        stat.className = "btn btn-info btn-sm pull-left";
        document.getElementById("#navbar").appendChild(stat);
    }

    if (profile) {
        if (preventMulThreads && sessionStorage.getItem("leftThread")) {
            var silent = JSON.parse(sessionStorage.getItem("silent"));
            stat.textContent = "Status: Interrupted";
            if (silent || prompt("Relisting was interrupted, was this intentional? (Y/N)") === "N") {
                var ele = document.createElement("html");
                ele.innerHTML += HTTPRequest("http://backpack.tf/classifieds/add/" + sessionStorage.getItem("curItem"));
                if (ele.querySelector(".avatar")) {
                    if (!silent)
                        alert("Stopped at (" + sessionStorage.getItem("curItem") + "), and appears invalid, removing");
                    else
                        stat.textContent = "Status: curItem invalid, removing";
                    sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
                }
                else {
                    if (!silent)
                        alert("Stopped at (" + sessionStorage.getItem("curItem") + "), but appears valid, please retry");
                    else
                        stat.textContent = "Status: curITem valid, retrying";
                }
                if (silent) {
                    stat.textContent = "Status: Returning";
                    document.querySelector(".fa-tag").click();
                }
            }
            else {
                sessionStorage.removeItem("leftThread");
                sessionStorage.removeItem("mainThread");
                localStorage.removeItem("threadRunning");
            }
        }
        stat.textContent = "Status: Loading";
        setTimeout(function() {
            document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                     document.getElementById("newlist").children.length - 1 + " ");
        }, 1000);
        addButton("annotate", "Annotate", false);
        if (isSelf) {
            addButton("fastlist", "Fast Listing", false);
            if (JSON.parse(sessionStorage.getItem("fastlist"))) {
                stat.textContent = "Status: Adding Fast Listing";
                Array.prototype.forEach.call(document.querySelectorAll(".item:not(.notrade):not(.spacer)"), function(e) {
                    if (!e.getAttribute("data-name").contains("Metal")) {
                        var listed = e.hasAttribute("data-listing-price"),
                            style = listed ? "fa-refresh" : "fa-plus-square",
                            canRelist = listed ? +e.getAttribute("data-listing-date").split(" ")[0] >= 30 : true,
                            html = "<a href='http://backpack.tf/classifieds/add/" + e.getAttribute("data-id") +
                                   "'>" + "<i class='fa " + style + " fa-inverse fa-border'" +
                                   " style='position: absolute; bottom: 2px; left: 2px;" +
                                   (canRelist ? "" : " background-color: red;") + "'></i></a>";
                        e.firstElementChild.insertAdjacentHTML("beforeend", html);
                    }
                    if (e.hasAttribute("data-gifted-name")) {
                        e.querySelector(".fa-gift").style.display = "none";
                        e.firstElementChild.insertAdjacentHTML("beforeend", "<i class='fa fa-gift fa-inverse" +
                                                               " fa-border pull-left'></i>");
                    }
                });
                Array.prototype.forEach.call(document.getElementsByClassName("killstreaker"), function(e) {
                    e.style.display = "none";
                });
            }
        }
        if (JSON.parse(sessionStorage.getItem("annotate"))) {
            stat.textContent = "Status: Annotating";
            Array.prototype.forEach.call(document.getElementsByClassName("value"), function(e) {
                if (!e.parentNode.parentNode.hasAttribute("data-crate")) {
                    if (+e.textContent.split("#")[1] <= 100)
                        e.insertAdjacentHTML("afterend", "<i class='fa fa-exclamation-triangle fa-inverse fa-border" +
                                             " pull-left'>" + e.textContent + "</i>");
                    e.style.display = "none";
                }
            });
            Array.prototype.forEach.call(document.querySelectorAll(".item:not(.notrade):not(.spacer)"), function(e) {
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
                    var colour = "#cd7f32";
                    if (title.contains("Specialized"))
                        colour = "#c0c0c0";
                    else if (title.contains("Professional"))
                        colour = "#ffd700";
                    box.insertAdjacentHTML("beforeend", "<i class='fa fa-bomb fa-border pull-left'" +
                                           " style='color: " + colour + "; background-color: white;'></i>");
                }
            });
        }
        stat.textContent = "Status: Loaded";
    }

    else if (listings || listPage) {
        sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
        addButton("paused", "Paused", false);
        addButton("reset", "Reset", false);
        addButton("silent", "Silent", false);
        if (JSON.parse(sessionStorage.getItem("reset"))) {
            stat.textContent = "Status: Removing Data";
            var paused = JSON.parse(sessionStorage.getItem("paused"));
            localStorage.removeItem("threadRunning");
            sessionStorage.clear();
            sessionStorage.setItem("paused", paused);
            stat.textContent = "Status: Removed Data";
            if (listings) {
                if (document.querySelector(".pagination-filters").firstElementChild.className === "disabled")
                    location.reload();
                else
                    document.querySelector(".fa-angle-double-left").click();
            }
            else
                document.querySelector(".fa-tag").click();
            return;
        }
        if (JSON.parse(sessionStorage.getItem("paused"))) {
            console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
            stat.textContent = "Status: Paused";
            return;
        }
        if (preventMulThreads && JSON.parse(sessionStorage.getItem("mainThread")))
            window.addEventListener("beforeunload", function() {
                sessionStorage.setItem("leftThread", true);
            });
    }

    else {
        if (preventMulThreads && JSON.parse(sessionStorage.getItem("leftThread"))) {
            sessionStorage.removeItem("leftThread");
            sessionStorage.removeItem("mainThread");
            localStorage.removeItem("threadRunning");
        }
    }

    if (listings) {
        var first = document.querySelector(".pagination-filters").firstElementChild.className === "disabled",
            last = document.querySelector(".pagination-filters").lastElementChild.className === "disabled",
            buttons = document.getElementsByClassName("listing-relist"),
            trades = Object.keys(sessionStorage).filter(function(e) {
                return e.startsWith("itmdata-");
            });
        if (preventMulThreads && localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
            console.info("Backpack.tf Script Terminated (Not Main Thread) " + GM_info.script.version);
            stat.textContent = "Status: Terminated (Not Main Thread)";
            return;
        }
        else if (preventMulThreads && !localStorage.getItem("threadRunning")) {
            if (trades.length || +sessionStorage.getItem("nextPage") > 2) {
                stat.textContent = "Status: Interrupted";
                document.activeElement.blur();
                if (prompt("Looks like relisting was interrupted, continue? (Y/N)") === 'N' ||
                    JSON.parse(sessionStorage.getItem("silent"))) {
                    sessionStorage.setItem("reset", true);
                    location.reload();
                    return;
                }
            }
            localStorage.setItem("threadRunning", true);
            sessionStorage.setItem("mainThread", true);
        }
        if (trades.length) {
            var ind = trades[randomRelist ? range(0, trades.length - 1) : 0].slice(8);
            stat.textContent = "Status: Relisting page " + (sessionStorage.getItem("nextPage") - 1);
            sessionStorage.setItem("curItem", ind);
            location.assign("http://backpack.tf/classifieds/add/" + ind);
        }
        else if (first && +sessionStorage.getItem("nextPage") > 2) {
            stat.textContent = "Status: Jumping to next page";
            location.assign(window.location.href + "&page=" + sessionStorage.getItem("nextPage"));
        }
        else if (buttons.length) {
            stat.textContent = "Status: Saving IDs";
            Array.prototype.forEach.call(buttons, function(e) {
                sessionStorage.setItem("itmdata-" + e.href.slice(35), 0);
            });
            stat.textContent = "Status: Finished Saving IDs";
            sessionStorage.setItem("curItem", buttons[0].href.slice(35));
            location.assign("http://backpack.tf/classifieds/add/" + buttons[0].href.slice(35));
        }
        else {
            if (last) {
                stat.textContent = "Status: Finished";
                localStorage.removeItem("threadRunning");
                sessionStorage.removeItem("mainThread");
                sessionStorage.removeItem("nextPage");
                var data = document.createElement("small"),
                    reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                data.style =  "color: orange; float: right;";
                document.querySelector(".panel-heading").appendChild(data);
                setInterval(showStatus, 1000);
            }
            else {
                if (!first)
                    sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + 1);
                stat.textContent = "Status: Moving to next page";
                document.querySelector(".fa-angle-right").click();
            }
        }
    }
    else if (listPage) {
        switch (document.getElementById("item-overview-name").firstElementChild.textContent) {
            case "Relisting this item":
                stat.textContent = "Status: Relisting " + window.location.href.slice(35);
                sessionStorage.removeItem("itmdata-" + window.location.href.slice(35));
                document.getElementById("button_save").click();
                break;
            case "Creating a new listing for this item":
                stat.textContent = "Status: Filling Fields";
                var itm = document.querySelector(".item"),
                    price = +itm.getAttribute("data-price"),
                    name = itm.getAttribute("data-name"),
                    title = itm.getAttribute("title") || "";
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
                    qualityN = itm.getAttribute("data-q-name"),
                    isAust = itm.hasAttribute("data-australium"),
                    isKS = title.contains("Killstreak"),
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
                    tier = 1;
                    if (title.contains("Specialized"))
                        tier = 2;
                    else if (title.contains("Professional"))
                        tier = 3;
                }
                var url,
                    heading = document.getElementsByClassName("panel-heading")[1];
                if (!isKS && !hasPaint)
                    url = "http://backpack.tf/stats/" + qualityN + "/" + name + "/" +
                          (tradable ? "" : "Non-") + "Tradable" + "/" + (craftable ? "" : "Non-") + "Craftable";
                else if (title.contains("Fabricator"))
                    url = "http://backpack.tf/stats/" + qualityN + "/Fabricator/Tradable/Craftable/" +
                          itm.getAttribute("data-priceindex");
                else if (title.contains("Kit"))
                    url = "http://backpack.tf/stats/" + qualityN + "/Fabricator/Tradable/Non-Craftable/" +
                          itm.getAttribute("data-priceindex");
                else
                    url = "http://backpack.tf/classifieds/?item=" + (isAust ? name.slice(11) : name) +
                              "&quality=" + quality + "&tradable=" + tradable + "&craftable=" + craftable +
                              (isAust ? "&australium=1" : "") + (isKS ? "&killstreak_tier=" + tier: "") +
                              (hasPaint ? "&paint=" + colour : "");
                var ele = document.createElement("html");
                ele.innerHTML += HTTPRequest(url);
                if (!ele.querySelector(".media-list").querySelector(".alert-info")) {
                    var list = ele.querySelector(".media-list").getElementsByClassName("item"),
                        lowest = list[0].getAttribute("data-listing-price"),
                        highest = list[list.length - 1].getAttribute("data-listing-price");
                    heading.textContent += " (" + lowest + " ~ " + highest + ", from " + list.length + " listings)";
                }
                else
                    heading.textContent += " (No other listings found)";
                if (isKS)
                    heading.textContent += " [Killstreak Tier: " + tier + "]";
                else if (hasPaint)
                    heading.textContent += " [Painted: " + itm.getAttribute("data-paint-name") + "]";
                stat.textContent = "Status: Finished Loading";
        }
    }
    console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
}
catch(e) {
    alert("[An error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
    stat.textContent = "Status: Error";
}
})();