// ==UserScript==
// @copyright           ©2014 - 2015, Damian Ho
// @description         Helper script for Backpack.tf
// @downloadURL         https://bitbucket.org/damianhxy/backpack.tf-enhancer/raw/master/relist.user.js
// @include             /^http:\/\/backpack\.tf.*$/
// @exclude             /^http:\/\/backpack\.tf\/api\/.*$/
// @name                Backpack.tf Enhancer
// @namespace           https://bitbucket.org/damianhxy
// @noframes
// @run-at              document-end
// @version             1.5.9.1
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        randomRelist = 1,            //[boolean] random item relisted?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        threshold = 0.22,            //[refined] threshold for price changes
        notes = localStorage.getItem("notes");
    /******** END OF SETTINGS *******/

    function addButton(prop, val, def, clr) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            text = document.createTextNode(" " + val),
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.style = "margin: 2px; width: 125px;" + (clr ? "" : " clear: both;");
        button.className = "btn btn-" + (activated ? "success" : "danger") + " btn-sm pull-right";
        button.addEventListener("click", function() {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        button.appendChild(createIcon("toggle-" + (activated ? "on" : "off"), "border: none;"));
        button.appendChild(text);
        document.getElementById("#navbar").appendChild(button);
    }

    function createIcon(cls, style, content) {
        var icon = document.createElement("i");
        icon.className = "fa fa-" + cls + " fa-inverse fa-border pull-left";
        icon.style = style;
        if (content)
            icon.appendChild(document.createTextNode(content));
        return icon;
    }

    function getAttr(ele) {
        var attr = {};
        Array.prototype.forEach.call(ele.attributes, function(e) {
            attr[e.name] = isNaN(+e.value) ? e.value : +e.value;
        });
        return attr;
    }

    function label(ele, annotate, fastlist, change) {
        var frag = document.createDocumentFragment(),
            attr = getAttr(ele);
        if (annotate || fastlist) {
            if (ele.querySelector(".killstreaker"))
                ele.querySelector(".killstreaker").style.display = "none";
            if (ele.querySelector(".value") && !attr["data-crate"])
                ele.querySelector(".value").style.display = "none";
        }
        if (annotate) {
            var title = attr["data-default-name"] || attr["title"];
            if (ele.querySelector(".value") && !attr["data-crate"])
                if (+craft.textContent.split("#")[1] <= 100)
                    frag.appendChild(createIcon("exclamation-triangle", null, craft.textContent));
            if (attr["data-paint-name"] && attr["data-paint-name"] !== attr["data-name"])
                frag.appendChild(createIcon("paint-brush"));
            if (attr["data-part-1-name"])
                frag.appendChild(createIcon("cogs"));
            if (attr["data-spell-1"])
                frag.appendChild(createIcon("magic"));
            if (title.contains("Killstreak")) {
                var colour = "#cd7f32";
                if (title.contains("Specialized"))
                    colour = "#c0c0c0";
                else if (title.contains("Professional"))
                    colour = "#ffd700";
                frag.appendChild(createIcon("bomb", "color: " + colour + "; background-color: white;"));
            }
        }
        if (fastlist) {
            if (!attr["data-name"].contains("Metal")) {
                var listed = attr["data-listing-price"],
                    arr = (attr["data-listing-date"] || "").split(" "),
                    canRelist = !listed || +arr[0] >= 30 && arr[1].contains("minute") ||
                                +arr[0] && arr[1].contains("hour"),
                    link = document.createElement("a");
                link.href = "http://backpack.tf/classifieds/add/" + attr["data-id"];
                link.appendChild(createIcon(listed ? "refresh" : "plus-square",
                                            "position: absolute; bottom: 2px; left: 2px;" +
                                            (canRelist ? "" : " background-color: red;")));
                frag.appendChild(link);
                if (listed) {
                    var btn = document.createElement("a"),
                        rem = createIcon("close", "background-color: red;");
                    btn.href = "javascript:void(0)";
                    rem.addEventListener("click", function() {
                        if (!confirm("Are you sure?")) return;
                        var ID = "440_" + attr["data-id"],
                            data = JSON.parse(HTTPRequest("/classified/remove/" + ID, "POST"));
                        if (data.success) {
                            var link = rem.parentNode.previousElementSibling.firstElementChild;
                            rem.style.display = "none";
                            link.style.backgroundColor = "";
                            link.className = link.className.replace("refresh", "plus-square");
                            rem.parentNode.nextElementSibling.display = "none";
                        } else alert("Error: " + data.error);
                    });
                    btn.appendChild(rem);
                    frag.appendChild(btn);
                }
            }
            if (attr["data-gifted-name"]) {
                ele.querySelector(".fa-gift").style.display = "none";
                frag.appendChild(createIcon("gift"));
            }
        }
        if (change && attr["data-listing-price"]) {
            if (ele.querySelector(".value") && !attr["data-crate"])
                ele.querySelector(".value").style.display = "none";
            var curP = attr["data-price"],
                listP = parsePrice(attr["data-listing-price"]),
                diff = Math.abs(curP - listP);
            if (!attr["data-price"])
                frag.appendChild(createIcon("question"));
            else if (diff >= threshold) {
                var colour = "lime";
                if (diff >= threshold * 2 && diff <= threshold * 4)
                    colour = "yellow";
                else if (diff > threshold * 4)
                    colour = "red";
                frag.appendChild(createIcon("level-" + (curP > listP ? "up" : "down"), "color: " + colour + ";" +
                                            " background-color: white;"));
            }
        }
        ele.firstElementChild.appendChild(frag);
    }

    function HTTPRequest(URL, method = "GET") {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, URL, false);
        xmlhttp.send();
        return xmlhttp.responseText;
    }

    function parsePrice(str) {
        var arr = str.split(" "),
            bud = 0,
            key = 0,
            ref = 0;
        arr.forEach(function(e, i) {
            if (e.contains("ref"))
                ref = +arr[i - 1];
            else if (e.contains("key"))
                key = +arr[i - 1];
            else if (e.contains("bud"))
                bud = +arr[i - 1];
        });
        return ref + key * keyP + bud * budP * keyP;
    }

    function range(lo, hi) {
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    function removeData() {
        localStorage.removeItem("threadRunning");
        ["reset", "mainThread", "curItem", "nextPage", "paused"].forEach(function(e) {
            sessionStorage.removeItem(e);
        });
        Object.keys(sessionStorage).forEach(function(e) {
            if (e.startsWith("itmdata-"))
                sessionStorage.removeItem(e);
        });
    }

    function round(num) {
        if (num <= 5 / 90)
            return num;
        return Math.floor(num) + Math.ceil(num % 1 * 9 - 1e-14) / 9;
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime % 60;
            data.textContent = "Reloading classifieds in " + min + ":" + ("0" + sec).slice(-2);
            document.title = "Classifieds: " + min + ":" + ("0" + sec).slice(-2);
            reloadTime--;
        } else {
            document.querySelector(".fa-angle-double-left").click();
            clearInterval(showStatus);
        }
    }

    function update() {
        if (document.getElementById("login"))
            return console.info("Backpack.tf Script Paused (Signed Out). Version " + GM_info.script.version);
        if (sessionStorage.getItem("mainThread"))
            return console.info("Suppressed price updating");
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        var data = JSON.parse(HTTPRequest("http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.getItem("apikey")));
        if (!data.response.success) {
            if (data.response.message === "API key does not exist.") {
                alert("Invalid API key");
                localStorage.removeItem("apikey");
                update();
            } else
                return alert("Error: " + data.response.message);
        }
        var key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
            bud = data.response.items.Earbuds.prices[6].Tradable.Craftable[0],
            r = +(data.response.raw_usd_value * 100).toFixed(2),
            k = (key.value + (key.value_high || key.value)) / 2,
            b = (bud.value + (bud.value_high || bud.value)) / 2,
            rDiff = "(" + (r === refP ? "=" : (r < refP ? "↓" : "↑")) + ")",
            kDiff = "(" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
            bDiff = "(" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
        localStorage.setItem("refP", r);
        localStorage.setItem("keyP", k);
        localStorage.setItem("budP", b);
        alert("Prices updated, Refined: " + r + " Cents " + rDiff + ", Keys: " + k + " Refined " + kDiff +
              ", Earbuds: " + b + " Keys " + bDiff);
        localStorage.setItem("lastupdt", new Date());
        return location.reload();
    }

    try {
        /******** SCRIPT GLOBALS ********/
        var listPage = document.URL.contains("/add"),
            profile = document.URL.contains("profiles"),
            listings = document.querySelector(".listing-remove") && document.URL.contains("steamid="),
            refP = +localStorage.getItem("refP") || update(),
            keyP = +localStorage.getItem("keyP") || update(),
            budP = +localStorage.getItem("budP") || update(),
            lastUpdt = new Date() - Date.parse(localStorage.getItem("lastupdt"));
        /****** END SCRIPT GLOBALS ******/

        if (!lastUpdt || lastUpdt >= 864e5 * updateFreq)
            update();
        else {
            var diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
        }

        if (profile || listings || listPage) {
            var info = document.createElement("div"),
                stat = document.createTextNode("");
            info.style = "margin: 2px; width: 150px;";
            info.className = "btn btn-info btn-sm pull-left";
            info.appendChild(createIcon("info-circle", "border: none;"));
            info.appendChild(document.createTextNode("Status: "));
            info.appendChild(stat);
            document.getElementById("#navbar").appendChild(info);
            addButton("paused", "Paused", false, true);
            addButton("silent", "Silent", false);
        }

        if (profile) {
            if (sessionStorage.getItem("mainThread")) {
                var silent = JSON.parse(sessionStorage.getItem("silent"));
                stat.textContent = "Interrupted";
                if (silent || confirm("Relisting was interrupted, now diagnosing...")) {
                    var ele = document.createElement("html");
                    ele.innerHTML += HTTPRequest("http://backpack.tf/classifieds/add/" +
                                     sessionStorage.getItem("curItem"));
                    if (ele.querySelector(".avatar")) {
                        if (!silent)
                            alert("[" + sessionStorage.getItem("curItem") + "] is invalid");
                        sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
                    } else if (!silent)
                        alert("[" + sessionStorage.getItem("curItem") + "] is valid");
                    stat.textContent = "Returning";
                    return document.querySelector(".fa-tag").click();
                } else
                    removeData();
            }
            addButton("annotate", "Annotate", false);
            addButton("pricediff", "Show Change", false);
            if (document.querySelector(".dropdown-btn").href === document.URL)
                addButton("fastlist", "Direct Listing", false);
            setTimeout(function() {
                document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                         document.getElementById("newlist").children.length - 1 + " ");
            }, 1000);
            Array.prototype.forEach.call(document.querySelectorAll("[data-tradable='1']"), function(e) {
                label(e, JSON.parse(sessionStorage.getItem("annotate")),
                      JSON.parse(sessionStorage.getItem("fastlist")),
                      JSON.parse(sessionStorage.getItem("pricediff")));
            });
            stat.textContent = "Loaded";
        } else if (listings || listPage) {
            sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
            addButton("reset", "Reset", false);
            if (JSON.parse(sessionStorage.getItem("reset"))) {
                removeData();
                stat.textContent = "Resetted";
                return document.querySelector(".fa-tag").click();
            }
            if (JSON.parse(sessionStorage.getItem("paused"))) {
                stat.textContent = "Paused";
                return console.info("Backpack.tf Script Paused. Version " + GM_info.script.version);
            }
        }

        if (listings) {
            var onePg = !document.querySelector(".pagination-filters"),
                first = onePg || document.querySelector(".pagination-filters").firstElementChild.className === "disabled",
                last = onePg || document.querySelector(".pagination-filters").lastElementChild.className === "disabled",
                buttons = document.getElementsByClassName("listing-relist"),
                trades = Object.keys(sessionStorage).filter(function(e) {
                    return e.startsWith("itmdata-");
                });
            if (localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
                stat.textContent = "Terminated";
                return console.info("Backpack.tf Script Terminated (Not Main Thread). Version " + GM_info.script.version);
            } else if (!localStorage.getItem("threadRunning")) {
                if (trades.length || +sessionStorage.getItem("nextPage") !== 2) {
                    stat.textContent = "Interrupted";
                    if (confirm("Relisting was interrupted, resetting...") ||
                        JSON.parse(sessionStorage.getItem("silent"))) {
                        sessionStorage.setItem("reset", true);
                        return document.querySelector(".fa-tag").click();
                    }
                }
                localStorage.setItem("threadRunning", null);
                sessionStorage.setItem("mainThread", null);
            } else if (document.querySelector("[class^='alert-']")) {
                stat.textContent = "Error";
                sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
            }
            if (trades.length) {
                var id = trades[randomRelist ? range(0, trades.length - 1) : 0].slice(8);
                stat.textContent = "Page " + (sessionStorage.getItem("nextPage") - 1);
                sessionStorage.setItem("curItem", id);
                location.assign("http://backpack.tf/classifieds/add/" + id);
            } else if (buttons.length) {
                Array.prototype.forEach.call(buttons, function(e) {
                    sessionStorage.setItem("itmdata-" + e.href.slice(35), false);
                });
                stat.textContent = "Saved IDs";
                sessionStorage.setItem("curItem", buttons[0].href.slice(35));
                location.assign("http://backpack.tf/classifieds/add/" + buttons[0].href.slice(35));
            } else if (first) {
                stat.textContent = "Jumping";
                location.assign(document.URL + "&page=" + sessionStorage.getItem("nextPage"));
            } else {
                if (last) {
                    localStorage.removeItem("threadRunning");
                    sessionStorage.removeItem("mainThread");
                    sessionStorage.removeItem("nextPage");
                    var data = document.createElement("small"),
                        reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                    data.style = "color: orange; float: right;";
                    document.querySelector(".panel-heading").appendChild(data);
                    setInterval(showStatus, 1000);
                    stat.textContent = "Finished";
                } else {
                    sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + !first);
                    stat.textContent = "Moving";
                    document.querySelector(".fa-angle-right").click();
                }
            }
        } else if (listPage) {
            switch (document.querySelector(".item-panel").children[1].textContent.trim()) {
                case "Relisting this item":
                    stat.textContent = "Relisting";
                    sessionStorage.removeItem("itmdata-" + document.URL.slice(35));
                    document.getElementById("button_save").click();
                    break;
                case "Creating a new listing for this item":
                    stat.textContent = "Filling";
                    var attr = getAttr(document.querySelector(".item")),
                        price = attr["data-price"],
                        name = attr["data-name"],
                        title = attr["data-default-name"] || attr["title"],
                        quality = attr["data-quality"],
                        trade = attr["data-tradable"],
                        craft = attr["data-craftable"],
                        qualityN = attr["data-q-name"],
                        isAust = attr["data-australium"],
                        hasPaint = attr["data-paint-name"],
                        isKS = title.contains("Killstreak"),
                        colour,
                        tier = 1;
                    if (!price || isKS) {
                        document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Unpriced)");
                        if (attr["data-market-p"] != -1)
                            price = attr["data-market-p"] / refP;
                    } else if (attr["data-p-bptf"].contains("–"))
                        document.querySelector(".col-2").firstElementChild.insertAdjacentHTML("beforeend", " (Ranged)");
                    if (price >= keyP && !name.contains("Key")) {
                        if (price >= keyP * budP && !name.contains("Earbuds")) {
                            document.getElementById("earbuds").value = Math.floor(price / (keyP * budP));
                            price %= keyP * budP;
                        }
                        document.getElementById("keys").value = Math.floor(price / keyP);
                        price %= keyP;
                    }
                    price = Math.floor(round(price) * 100) / 100;
                    document.getElementById("metal").value = price || "";
                    document.getElementById("details").value = notes;
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
                        };
                        colour = paint[attr["data-paint-name"]];
                    }
                    if (isKS) {
                        if (title.contains("Specialized"))
                            tier = 2;
                        else if (title.contains("Professional"))
                            tier = 3;
                    }
                    var url = "http://backpack.tf/stats/" + qualityN + "/",
                        heading = document.getElementsByClassName("panel-heading")[1];
                    if (!isKS && !hasPaint)
                        url += name + "/" + (trade ? "" : "Non-") + "Tradable/" + (craft ? "" : "Non-") + "Craftable";
                    else if (title.contains("Fabricator"))
                        url += "Fabricator/Tradable/Craftable/" + attr["data-priceindex"];
                    else if (title.contains("Kit"))
                        url += "Kit/Tradable/Non-Craftable/" + attr["data-priceindex"];
                    else
                        url = "http://backpack.tf/classifieds/?item=" + name.slice(isAust * 11) +
                              "&quality=" + quality + "&tradable=" + trade + "&craftable=" + craft +
                              "&australium=" + isAust + "&killstreak_tier=" + isKS * tier + "&paint=" + colour;
                    var ele = document.createElement("html"),
                        hasListings;
                    ele.innerHTML += HTTPRequest(url);
                    if (!hasPaint && (!isKS || title.contains("Kit")))
                        hasListings = !ele.querySelector(".col-6").querySelector(".alert-info");
                    else
                        hasListings = !ele.querySelector(".media-list").querySelector(".alert-info");
                    if (hasListings) {
                        var list = ele.querySelectorAll("[data-listing-date]"),
                            lowest = list[0].getAttribute("data-listing-price"),
                            highest = list[list.length - 1].getAttribute("data-listing-price");
                        heading.textContent += " (" + lowest + " ~ " + highest + ", from " + list.length + " listings)";
                    } else
                        heading.textContent += " (No other listings found)";
                    if (isKS)
                        heading.textContent += " [Killstreak Tier " + tier + "]";
                    else if (hasPaint)
                        heading.textContent += " [Painted " + attr["data-paint-name"] + "]";
                    stat.textContent = "Loaded";
            }
        }
        console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
    } catch(e) {
        if (profile || listings || listPage)
            stat.textContent = "Crashed";
        alert("[A fatal error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
    }
})();