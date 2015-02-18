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
// @version             1.6.1.1
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
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.style = "margin: 2px; width: 125px;" + (clr ? "" : " clear: both;");
        button.className = "btn btn-" + (activated ? "success" : "danger") + " btn-sm pull-right";
        button.addEventListener("click", function() {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        button.appendChild(createIcon("toggle-" + (activated ? "on" : "off"), "border: none;"));
        button.appendChild(document.createTextNode(val));
        document.getElementById("#navbar").appendChild(button);
    }

    function createIcon(cls, style, content) {
        var icon = document.createElement("i");
        icon.className = "fa fa-" + cls + " fa-inverse fa-border pull-left";
        icon.style = "border-radius: 50%;" + (style ? " " + style : "");
        if (content)
            icon.appendChild(document.createTextNode(content));
        return icon;
    }

    function getAttr(ele) {
        var attr = new Map();
        Array.prototype.forEach.call(ele.attributes, function(e) {
            attr.set(e.name, isNaN(+e.value) ? e.value : +e.value);
        });
        return attr;
    }

    function label(ele, annotate, fastlist, change) {
        var frag = document.createDocumentFragment(),
            attr = getAttr(ele);
        if (annotate || fastlist) {
            if (ele.querySelector(".killstreaker"))
                ele.querySelector(".killstreaker").style.display = "none";
            if (ele.querySelector(".value") && !attr.has("data-crate"))
                ele.querySelector(".value").style.display = "none";
        }
        if (fastlist && document.querySelector(".dropdown-btn").href === document.URL.replace("#", "")) {
            if (!attr.get("data-name").contains("Metal")) {
                var arr = (attr.get("data-listing-date") || "").split(" "),
                    canRelist = +arr[0] >= 30 && arr[1].contains("minute") || arr[0] && arr[1].contains("hour"),
                    link = document.createElement("a");
                link.href = "http://backpack.tf/classifieds/add/" + attr.get("data-id");
                link.appendChild(createIcon(arr[0] ? "refresh" : "plus", "position: absolute; bottom: 0; left: 0;" +
                                            (canRelist || !arr[0] ? "" : " background-color: red;")));
                frag.appendChild(link);
                if (arr[0]) {
                    var btn = document.createElement("a"),
                        rem = createIcon("close", "background-color: red;");
                    btn.href = "javascript:void(0)";
                    rem.addEventListener("click", function() {
                        if (!JSON.parse(sessionStorage.getItem("silent")) && !confirm("Are you sure?")) return;
                        HTTPRequest("/classified/remove/440_" + attr.get("data-id"), "POST", function(e) {
                            var data = JSON.parse(e);
                            if (data.success || alert("Error: " + data.error)) {
                                var link = rem.parentNode.previousElementSibling.firstElementChild;
                                rem.style.display = "none";
                                link.style.backgroundColor = "";
                                link.className = link.className.replace("refresh", "plus");
                                rem.parentNode.parentNode.nextElementSibling.style.display = "none";
                            }
                        });
                    });
                    btn.appendChild(rem);
                    frag.appendChild(btn);
                }
            }
            if (attr.has("data-gifted-name")) {
                ele.querySelector(".fa-gift").style.display = "none";
                frag.appendChild(createIcon("gift"));
            }
        }
        if (change && attr.has("data-listing-price")) {
            if (ele.querySelector(".value") && !attr.has("data-crate"))
                ele.querySelector(".value").style.display = "none";
            var curP = attr.get("data-price"),
                listP = parsePrice(attr.get("data-listing-price")),
                diff = Math.abs(curP - listP);
            if (!curP || attr.get("title").contains("Killstreak"))
                frag.appendChild(createIcon("question", "color: goldenrod; background-color: white;"));
            else if (diff >= threshold) {
                var colour = "lime";
                if (diff >= threshold * 2 && diff <= threshold * 4)
                    colour = "goldenrod";
                else if (diff > threshold * 4)
                    colour = "crimson";
                frag.appendChild(createIcon("level-" + (curP > listP ? "up" : "down"), "color: " + colour + ";" +
                                            " background-color: white;"));
            }
        }
        if (annotate) {
            var title = attr.get("data-default-name") || attr.get("title");
            if (craft && !attr.has("data-crate") && +craft.textContent.split("#")[1] <= 100)
                frag.appendChild(createIcon("exclamation-triangle", null, craft.textContent));
            if (attr.has("data-paint-name") && attr.get("data-paint-name") !== attr.get("data-name"))
                frag.appendChild(createIcon("paint-brush"));
            if (attr.has("data-part-1-name"))
                frag.appendChild(createIcon("cogs"));
            if (attr.has("data-spell-1"))
                frag.appendChild(createIcon("magic"));
            if (title.contains("Killstreak")) {
                var colour = "darkgoldenrod";
                if (title.contains("Specialized"))
                    colour = "darkgray";
                else if (title.contains("Professional"))
                    colour = "gold";
                frag.appendChild(createIcon("bomb", "color: " + colour + "; background-color: white;"));
            }
        }
        ele.firstElementChild.appendChild(frag);
    }

    function HTTPRequest(URL, method, callback) {
        stat.textContent = "Sending";
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, URL, callback);
        xmlhttp.onreadystatechange = function() {
            stat.textContent = "[" + xmlhttp.readyState + ", " + xmlhttp.status + "]";
            if (xmlhttp.readyState === 4 && xmlhttp.status !== 200)
                stat.textContent = "Req. Error: " + xmlhttp.status;
        };
        xmlhttp.onload = function() {
            stat.textContent = "Received";
            return callback ? callback(xmlhttp.responseText) : xmlhttp.responseText;
        };
        xmlhttp.send();
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
                sec = reloadTime-- % 60;
            data.textContent = "Reloading classifieds in " + min + ":" + ("0" + sec).slice(-2);
            document.title = "Classifieds: " + min + ":" + ("0" + sec).slice(-2);
        } else {
            document.querySelector(".fa-angle-double-left").click();
            clearInterval(showStatus);
        }
    }

    function update() {
        if (document.getElementById("login"))
            return console.info("Backpack.tf Script Paused (Signed Out). Version " + GM_info.script.version);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        HTTPRequest("http://backpack.tf/api/IGetPrices/v4/?key=" + localStorage.getItem("apikey"), "GET", function(e) {
            var data = JSON.parse(e);
            if (!data.response.success) {
                if (data.response.message === "API key does not exist.") {
                    alert("Invalid API key");
                    localStorage.removeItem("apikey");
                    return update();
                } else
                    return alert("Error:\n" + data.response.message);
            }
            var key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                bud = data.response.items.Earbuds.prices[6].Tradable.Craftable[0],
                r = Math.floor(data.response.raw_usd_value * 100),
                k = (key.value + (key.value_high || key.value)) / 2,
                b = (bud.value + (bud.value_high || bud.value)) / 2,
                rDiff = "(" + (r === refP ? "=" : (r < refP ? "↓" : "↑")) + ")",
                kDiff = "(" + (k === keyP ? "=" : (k < keyP ? "↓" : "↑")) + ")",
                bDiff = "(" + (b === budP ? "=" : (b < budP ? "↓" : "↑")) + ")";
                localStorage.setItem("refP", r);
                localStorage.setItem("keyP", k);
                localStorage.setItem("budP", b);
                if (!sessionStorage.getItem("mainThread"))
                    alert("Prices updated, Refined: " + r + " Cents " + rDiff + ", Keys: " + k + " Refined " + kDiff +
                          ", Earbuds: " + b + " Keys " + bDiff);
                localStorage.setItem("lastupdt", new Date());
                return location.reload();
        });
    }

    try {
        /******** SCRIPT GLOBALS ********/
        var listPage = document.URL.contains("/add"),
            profile = document.URL.contains("profiles"),
            listings = document.querySelector(".listing-remove") && document.URL.contains("steamid="),
            refP = +localStorage.getItem("refP"),
            keyP = +localStorage.getItem("keyP"),
            budP = +localStorage.getItem("budP"),
            lastUpdt = new Date() - Date.parse(localStorage.getItem("lastupdt")),
            stat = document.createTextNode("");
        /****** END SCRIPT GLOBALS ******/

        if (lastUpdt && refP && keyP && budP && lastUpdt < 864e5 * updateFreq || update()) {
            var diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info("Prices will update in " + days + " day(s), " + hours + " hour(s), and " + minutes + " min(s)");
        }

        if (profile || listings || listPage) {
            var info = document.createElement("div");
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
                if (silent || confirm("Diagnose interrupt?") || removeData()) {
                    HTTPRequest("http://backpack.tf/classifieds/add/" + sessionStorage.getItem("curItem"), "GET",
                        function(e) {
                            var ele = document.createElement("html");
                            ele.innerHTML += e;
                            if (ele.querySelector(".avatar")) {
                                if (!silent)
                                    alert("Listing for [" + sessionStorage.getItem("curItem") + "] is invalid");
                                sessionStorage.removeItem("itmdata-" + sessionStorage.getItem("curItem"));
                            } else if (!silent)
                                alert("Listing for [" + sessionStorage.getItem("curItem") + "] is valid");
                            stat.textContent = "Returning";
                            return document.querySelector(".fa-tag").click();
                    });
                }
            }
            addButton("annotate", "Annotate", false);
            addButton("pricediff", "Show Change", false);
            if (document.querySelector(".dropdown-btn").href === document.URL.replace("#", ""))
                addButton("fastlist", "Quick Listing", false);
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
                first = onePg || document.querySelector(".pagination-filters > li:first-child").className === "disabled",
                last = onePg || document.querySelector(".pagination-filters > li:last-child").className === "disabled",
                buttons = document.getElementsByClassName("listing-relist"),
                trades = Object.keys(sessionStorage).filter(function(e) {
                    return e.startsWith("itmdata-");
                });
            if (localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
                stat.textContent = "Terminated";
                return console.info("Backpack.tf Script Terminated (Not Main Thread). Version " + GM_info.script.version);
            } else if (!localStorage.getItem("threadRunning")) {
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
                    sessionStorage.setItem("itmdata-" + e.href.slice(35), null);
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
            switch (document.querySelector(".item-panel > h2").textContent.trim()) {
                case "Relisting this item":
                    stat.textContent = "Relisting";
                    sessionStorage.removeItem("itmdata-" + document.URL.slice(35));
                    document.getElementById("button_save").click();
                    break;
                default:
                    stat.textContent = "Loading";
                    var attr = getAttr(document.querySelector(".item")),
                        price = attr.get("data-price"),
                        name = attr.get("data-name"),
                        title = attr.get("data-default-name") || attr.get("title"),
                        quality = attr.get("data-quality"),
                        qualityN = attr.get("data-q-name"),
                        trade = attr.has("data-tradable"),
                        craft = attr.has("data-craftable"),
                        isAust = attr.has("data-australium"),
                        paint = attr.get("data-paint-name"),
                        pIndex = attr.get("data-priceindex"),
                        isKS = title.contains("Killstreak"),
                        tier = 1,
                        colour;
                    if (!price || isKS) {
                        document.querySelector(".col-2 > label").insertAdjacentHTML("beforeend", " (Unpriced)");
                        if (attr.get("data-market-p") !== -1)
                            price = attr.get("data-market-p") / refP;
                    } else if (attr.get("data-p-bptf").contains("–"))
                        document.querySelector(".col-2 > label").insertAdjacentHTML("beforeend", " (Ranged)");
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
                    if (isKS) {
                        if (title.contains("Specialized"))
                            tier = 2;
                        else if (title.contains("Professional"))
                            tier = 3;
                    }
                    HTTPRequest("/pages/filter_meta", "GET", function(e) {
                        var data = JSON.parse(e);
                        if (paint)
                            Array.prototype.some.call(data.paint, function(e) {
                                return e.name === paint ? colour = e.id : false;
                            });
                        var url = "http://backpack.tf/stats/" + qualityN + "/";
                        if (!isKS && !paint)
                            url += name + (trade ? "/" : "/Non-") + "Tradable/" + (craft ? "" : "Non-") + "Craftable";
                        if (qualityN === "Unusual")
                            url += "/" + pIndex;
                        else if (title.contains("Fabricator"))
                            url += "Fabricator/Tradable/Craftable/" + pIndex;
                        else if (title.contains("Kit"))
                            url += "Kit/Tradable/Non-Craftable/" + pIndex;
                        else
                            url = "http://backpack.tf/classifieds/?item=" + name.slice(isAust * 11) +
                                  "&quality=" + quality + "&tradable=" + trade + "&craftable=" + craft +
                                  "&australium=" + isAust + "&killstreak_tier=" + isKS * tier + "&paint=" + colour;
                        HTTPRequest(url, "GET", function(e) {
                            var ele = document.createElement("html"),
                                hasListings,
                                str = "";
                            ele.innerHTML += e;
                            if (!paint && (!isKS || title.contains("Kit")))
                                hasListings = !ele.querySelector(".col-6 .alert-info");
                            else
                                hasListings = !ele.querySelector(".media-list .alert-info");
                            if (hasListings) {
                                var list = ele.querySelectorAll("[data-listing-price]"),
                                    lowest = list[0].getAttribute("data-listing-price"),
                                    highest = list[list.length - 1].getAttribute("data-listing-price");
                                str += " (" + lowest + " ~ " + highest + " / " + list.length + " Listings)";
                            } else
                                str += " (No other listings)";
                            if (isKS)
                                str += " [" + data.killstreak_tiers[tier].name + " Killstreak]";
                            else if (paint)
                                str += " [Painted " + paint + "]";
                            document.getElementsByClassName("panel-heading")[1].textContent += str;
                            stat.textContent = "Loaded";
                        });
                    });
            }
        }
        console.info("Backpack.tf Script Loaded. Version " + GM_info.script.version);
    } catch(e) {
        if (stat)
            stat.textContent = "Fatal Error";
        alert("[A fatal error has occured]\n" + e.message + "\n[Stack Trace]\n" + e.stack);
    }
})();