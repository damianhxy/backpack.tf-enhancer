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
// @version             1.6.3.4
// ==/UserScript==

(function () {
    /*********** SETTINGS ***********/
    var randomTime = 1,              //[boolean] random reload time?
        defaultTime = 5,             //[minutes] default reload time
        randomMin = 3,               //[minutes] minimum random reload time
        randomMax = 10,              //[minutes] maximum random reload time
        updateFreq = 3,              //[days] price refresh frequency
        threshold = 0.22;            //[refined] threshold for price changes
    /******** END OF SETTINGS *******/

    function addButton(prop, val, def, clr) {
        sessionStorage.setItem(prop, sessionStorage.getItem(prop) || def);
        var button = document.createElement("a"),
            activated = JSON.parse(sessionStorage.getItem(prop));
        button.style = `margin: 2px; width: 125px;${clr ? "" : " clear: both;"}`;
        button.classList.add("btn", `btn-${activated ? "success" : "danger"}`, "btn-sm", "pull-right");
        button.addEventListener("click", () => {
            window.stop();
            sessionStorage.setItem(prop, !JSON.parse(sessionStorage.getItem(prop)));
            location.reload();
        });
        button.appendChild(createIcon(`toggle-${activated ? "on" : "off"}`, "border: none;"));
        button.appendChild(document.createTextNode(val));
        document.getElementById("#navbar").appendChild(button);
    }

    function check(predicate, callback) {
        predicate() ? callback() : setTimeout(() => check(predicate, callback), 500);
    }

    function createIcon(cls, style, content) {
        var icon = document.createElement("i");
        icon.classList.add("fa", `fa-${cls}`, "fa-inverse", "fa-border", "pull-left");
        icon.style = `border-radius: 50%;${style ? " " + style : ""}`;
        if (content)
            icon.appendChild(document.createTextNode(content));
        return icon;
    }

    function displayText(msg, spinner) {
        if (msg)
            stat.textContent = msg;
        if (spinner !== undefined) {
            icon.classList.toggle("fa-info-circle", !spinner);
            icon.classList.toggle("fa-refresh", spinner);
            icon.classList.toggle("fa-spin", spinner);
        }
    }

    function getAttr(ele) {
        var attr = {};
        Array.prototype.forEach.call(ele.attributes, e => attr[e.name] = isNaN(+e.value) ? e.value : +e.value);
        return attr;
    }

    function label(ele, annotate, fastlist, change) {
        var frag = document.createDocumentFragment(),
            attr = getAttr(ele),
            craft = ele.querySelector(".value");
        if (annotate || fastlist) {
            if (ele.querySelector(".killstreaker"))
                ele.querySelector(".killstreaker").style.display = "none";
            if (craft && !attr["data-crate"])
                craft.style.display = "none";
        }
        if (fastlist && document.querySelector(".dropdown-btn").href === document.URL.replace("#", "")) {
            if (!attr["data-name"].contains("Metal")) {
                var arr = (attr["data-listing-date"] || "").split(" "),
                    canRelist = +arr[0] >= 30 && arr[1].contains("minute") || arr[0] && arr[1].contains("hour"),
                    link = document.createElement("a");
                link.href = `backpack.tf/classifieds/add/${attr["data-id"]}`;
                link.appendChild(createIcon(arr[0] ? "refresh" : "plus", "position: absolute; bottom: 0; left: 0;" +
                                            (canRelist || !arr[0] ? "" : " background-color: red;")));
                if (!canRelist && arr[0])
                    link.style.display = "none";
                frag.appendChild(link);
                if (arr[0]) {
                    var btn = document.createElement("a");
                    btn.appendChild(createIcon("close", "background-color: red;"));
                    btn.href = "javascript:void(0)";
                    btn.addEventListener("click", () => {
                        if (!JSON.parse(sessionStorage.getItem("silent")) && !confirm("Are you sure?")) return;
                        HTTPRequest("POST", `/classified/remove/440_${attr["data-id"]}`, e => {
                            var data = JSON.parse(e);
                            if (data.success) {
                                var link = btn.previousElementSibling.firstElementChild;
                                btn.style.display = btn.parentNode.nextElementSibling.style.display = "none";
                                link.parentNode.style.display = link.style.backgroundColor = "";
                                link.classList.remove("fa-refresh");
                                link.classList.add("fa-plus");
                                displayText("Removed");
                            } else {
                                alert(`Error: ${data.error}`);
                                displayText("Error Removing");
                            }
                        });
                    });
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
            if (!curP || attr["title"].contains("Killstreak"))
                frag.appendChild(createIcon("question", "color: blueviolet; background-color: white;"));
            else if (diff >= threshold) {
                var colour = "lime";
                if (diff >= threshold * 2 && diff <= threshold * 4)
                    colour = "goldenrod";
                else if (diff > threshold * 4)
                    colour = "crimson";
                frag.appendChild(createIcon(`level-${curP > listP ? "up" : "down"}`, `color: ${colour}` +
                                            "; background-color: white;"));
            }
        }
        if (annotate) {
            var title = attr["data-default-name"] || attr["title"];
            if (craft && !attr["data-crate"] && +craft.textContent.split("#")[1] <= 100)
                frag.appendChild(createIcon("exclamation-triangle", null, craft.textContent));
            if (attr["data-paint-name"] && attr["data-paint-name"] !== attr["data-name"])
                frag.appendChild(createIcon("paint-brush"));
            if (attr["data-part-1-name"])
                frag.appendChild(createIcon("cogs"));
            if (attr["data-spell-1"])
                frag.appendChild(createIcon("magic"));
            if (title.contains("Killstreak")) {
                var colour = "darkgoldenrod";
                if (title.contains("Specialized"))
                    colour = "darkgray";
                else if (title.contains("Professional"))
                    colour = "gold";
                frag.appendChild(createIcon("bomb", `color: ${colour}; background-color: white;`));
            }
        }
        ele.firstElementChild.appendChild(frag);
    }

    function HTTPRequest(method, URL, callback) {
        displayText("Sending", true);
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, URL, callback);
        xmlhttp.onreadystatechange = () => {
            displayText(`[${xmlhttp.readyState}, ${xmlhttp.status}]`);
            if (xmlhttp.readyState === 4 && xmlhttp.status !== 200)
                displayText("Request Error", false);
        };
        xmlhttp.onload = () => {
            displayText("Received", false);
            return callback ? callback(xmlhttp.responseText) : xmlhttp.responseText;
        };
        xmlhttp.send();
    }

    function parsePrice(str) {
        var arr = str.split(" "),
            bud = 0,
            key = 0,
            ref = 0;
        arr.forEach((e, i) => {
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
        ["mainThread", "curItem", "nextPage", "paused", "toList"].forEach(e => sessionStorage.removeItem(e));
    }

    function round(num) {
        if (num <= 5 / 90)
            return num;
        num += num * 10 % 1 / 90;
        return Math.floor(num) + Math.round((num % 1 * 9).toFixed(2)) / 9;
    }

    function showStatus() {
        if (reloadTime) {
            var min = Math.floor(reloadTime / 60),
                sec = reloadTime-- % 60;
            data.textContent = `Reloading classifieds in ${min}:${("0" + sec).slice(-2)}`;
            document.title = `Classifieds: ${min}:${("0" + sec).slice(-2)}`;
        } else {
            document.querySelector(".fa-angle-double-left").click();
            clearInterval(showStatus);
        }
    }

    function update() {
        if (document.getElementById("login"))
            return console.info(`Backpack.tf Script Paused (Signed Out). Version ${GM_info.script.version}`);
        if (!localStorage.getItem("apikey"))
            localStorage.setItem("apikey", prompt("API key not set, register yours from http://backpack.tf/api/"));
        if (localStorage.getItem("apikey").length !== 24) {
            alert("Incorrect API key length");
            localStorage.removeItem("apikey");
            update();
        }
        HTTPRequest("GET", `backpack.tf/api/IGetPrices/v4/?key=${localStorage.getItem("apikey")}`, e => {
            var data = JSON.parse(e);
            if (!data.response.success) {
                if (data.response.message === "API key does not exist.") {
                    alert("Invalid API key");
                    localStorage.removeItem("apikey");
                    return update();
                } else
                    return alert(`Error:\n${data.response.message}`);
            }
            var key = data.response.items["Mann Co. Supply Crate Key"].prices[6].Tradable.Craftable[0],
                bud = data.response.items.Earbuds.prices[6].Tradable.Craftable[0],
                r = Math.floor(data.response.raw_usd_value * 100),
                k = (key.value + (key.value_high || key.value)) / 2,
                b = (bud.value + (bud.value_high || bud.value)) / 2,
                rDiff = `(${r === refP ? "=" : r < refP ? "↓" : "↑"})`;
                kDiff = `(${k === keyP ? "=" : k < keyP ? "↓" : "↑"})`;
                bDiff = `(${b === budP ? "=" : b < budP ? "↓" : "↑"})`;
                localStorage.setItem("refP", r);
                localStorage.setItem("keyP", k);
                localStorage.setItem("budP", b);
                if (!sessionStorage.getItem("mainThread"))
                    alert(`Prices updated, Refined: ${r} Cents ${rDiff}, Keys: ${k} Refined ${kDiff}, Earbuds: ${b}` +
                          ` Keys ${bDiff}`);
                localStorage.setItem("lastupdt", Date.now());
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
            lastUpdt = Date.now() - (+localStorage.getItem("lastupdt") || 0),
            icon = createIcon("info-circle", "border: none"),
            stat = document.createTextNode("Loading"),
            notes = localStorage.getItem("notes");
        /****** END SCRIPT GLOBALS ******/

        if (refP && keyP && budP && lastUpdt < 864e5 * updateFreq || update()) {
            var diff = 864e5 * updateFreq - lastUpdt,
                days = Math.floor(diff / 864e5),
                hours = Math.floor((diff % 864e5) / 36e5),
                minutes = Math.floor((diff % 36e5) / 6e4);
            console.info(`Prices will update in ${days} day(s), ${hours} hour(s) and ${minutes} min(s)`);
        }

        if (profile || listings || listPage) {
            var info = document.createElement("div");
            info.title = "Click to reset";
            info.style = "margin: 2px; width: 150px;";
            info.classList.add("btn", "btn-info", "btn-sm", "pull-left");
            info.appendChild(icon);
            info.appendChild(stat);
            info.addEventListener("click", () => {
                if (!confirm("Are you sure?")) return;
                removeData();
                displayText("Resetted");
                location.reload();
            });
            document.getElementById("#navbar").appendChild(info);
            addButton("paused", "Paused", false, true);
            addButton("silent", "Silent", false);
        }

        if (profile) {
            if (sessionStorage.getItem("mainThread")) {
                var cur = sessionStorage.getItem("curItem"),
                    silent = JSON.parse(sessionStorage.getItem("silent"));
                displayText("Interrupted");
                if (silent || confirm("Diagnose interrupt?") || removeData()) {
                    displayText(null, true);
                    HTTPRequest("GET", `backpack.tf/classifieds/add/${cur}`, e => {
                            var ele = document.createElement("html");
                            ele.innerHTML += e;
                            if (ele.querySelector(".avatar")) {
                                if (!silent)
                                    alert(`Listing for [${cur}] is invalid`);
                            } else if (!silent) {
                                alert(`Listing for [${cur}] is valid`);
                                var listings = JSON.parse(sessionStorage.getItem("toList"));
                                listings.push(cur);
                                sessionStorage.setItem("toList", JSON.stringify(listings));
                            }
                            displayText("Returning", false);
                            return document.querySelector(".fa-tag").click();
                    });
                }
            }
            addButton("annotate", "Annotate", false);
            addButton("pricediff", "Show Change", false);
            if (document.querySelector(".dropdown-btn").href === document.URL.replace("#", ""))
                addButton("fastlist", "Quick Listing", false);
            check(() => {
                return document.getElementsByClassName("pagenum").length;
            }, () => {
                document.querySelector("[href='#page0']").insertAdjacentHTML('afterbegin',
                         `${document.getElementById("newlist").childElementCount - 1} `);
            });
            Array.prototype.forEach.call(document.querySelectorAll("[data-tradable='1']"), e => {
                label(e, JSON.parse(sessionStorage.getItem("annotate")),
                      JSON.parse(sessionStorage.getItem("fastlist")),
                      JSON.parse(sessionStorage.getItem("pricediff")));
            });
            displayText("Loaded");
        } else if (listings || listPage) {
            sessionStorage.setItem("nextPage", sessionStorage.getItem("nextPage") || 2);
            if (JSON.parse(sessionStorage.getItem("paused"))) {
                displayText("Paused");
                return console.info(`Backpack.tf Script Paused. Version ${GM_info.script.version}`);
            }
        }

        if (listings) {
            var single = !document.querySelector(".pagination-filters"),
                first = single || document.querySelector(".pagination-filters > li:first-child").className === "disabled",
                end = single || document.querySelector(".pagination-filters > li:last-child").className === "disabled",
                buttons = document.getElementsByClassName("listing-relist"),
                items = JSON.parse(sessionStorage.getItem("toList")) || [],
                last;
            if (localStorage.getItem("threadRunning") && !sessionStorage.getItem("mainThread")) {
                displayText("Terminated");
                return console.info(`Backpack.tf Script Terminated (Not Main Thread). Version ${GM_info.script.version}`);
            } else if (!localStorage.getItem("threadRunning")) {
                localStorage.setItem("threadRunning", null);
                sessionStorage.setItem("mainThread", null);
            } else if (document.querySelector("[class^='alert-']"))
                displayText("Terminated");
            if (items.length) {
                displayText(`Relisting Page ${sessionStorage.getItem("nextPage") - 1}`, true);
                sessionStorage.setItem("curItem", last = items.pop());
                sessionStorage.setItem("toList", JSON.stringify(items));
                location.assign(`backpack.tf/classifieds/add/${last}`);
            } else if (buttons.length) {
                Array.prototype.forEach.call(buttons, e => items.push(e.href.slice(35)));
                sessionStorage.setItem("curItem", last = items.pop());
                sessionStorage.setItem("toList", JSON.stringify(items));
                displayText("Saved IDs", true);
                location.assign(`backpack.tf/classifieds/add/${last}`);
            } else if (first) {
                displayText(`Jumping to ${sessionStorage.getItem("nextPage")}`, true);
                location.assign(`${document.URL}&page=${sessionStorage.getItem("nextPage")}`);
            } else {
                if (end) {
                    localStorage.removeItem("threadRunning");
                    sessionStorage.removeItem("mainThread");
                    sessionStorage.removeItem("nextPage");
                    var data = document.createElement("small"),
                        reloadTime = randomTime ? range(randomMin * 60, randomMax * 60) : defaultTime * 60;
                    data.style = "color: orange; float: right;";
                    document.querySelector(".panel-heading").appendChild(data);
                    setInterval(showStatus, 1000);
                    displayText("Finished");
                } else {
                    sessionStorage.setItem("nextPage", +sessionStorage.getItem("nextPage") + !first);
                    displayText("Moving");
                    document.querySelector(".fa-angle-right").click();
                }
            }
        } else if (listPage) {
            switch (document.querySelector(".item-panel > h2").textContent.trim()) {
                case "Relisting this item":
                    displayText("Relisting Item", true);
                    document.getElementById("button_save").click();
                    break;
                default:
                    displayText("Loading");
                    var attr = getAttr(document.querySelector(".item")),
                        colour = 0,
                        isAust = attr["data-australium"],
                        isKS = title.contains("Killstreak"),
                        name = attr["data-name"],
                        paint = attr["data-paint-name"],
                        pIndex = attr["data-priceindex"],
                        price = attr["data-price"],
                        quality = attr["data-quality"],
                        tier = 0,
                        title = attr["data-default-name"] || attr["title"];
                    if (!price || isKS) {
                        document.querySelector(".col-2 > label").insertAdjacentHTML("beforeend", " (Unpriced)");
                        if (~ attr["data-market-p"])
                            price = attr["data-market-p"] / refP;
                    } else if (attr["data-p-bptf"].contains("–"))
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
                    if (isKS)
                        tier = ["Professional", "Specialized", "Killstreak"].findIndex(e => title.contains(e));
                    tier = ~ tier ? 3 - tier : 0;
                    HTTPRequest("GET", "/pages/filter_meta", e => {
                        var data = JSON.parse(e),
                            extended = true;
                        if (paint)
                            colour = data.paint.find(e => e.name === paint).id;
                        var url = `/classifieds/?item=${name.slice(isAust * 11)}&quality=${quality}` +
                                  `&tradable=${attr["data-tradable"]}&craftable=${attr["data-craftable"]}` +
                                  `&australium=${isAust}&paint=${colour}&killstreak_tier=${isKS * tier}`;
                        if (attr["data-craft"])
                            url += `&numeric=crate&comparison=eq&value=${attr["data-craft"]}`;
                        if (pIndex) {
                            if (quality === 5)
                                url += `&particle=${pIndex}`;
                            else {
                                extended = false;
                                url = "backpack.tf/stats/Unique/";
                                if (title.contains("Chemistry Set"))
                                    url += "Chemistry Set/Tradable/Craftable/";
                                else if (title.contains("Fabricator"))
                                    url += "Fabricator/Tradable/Craftable/";
                                else if (title.contains("Kit"))
                                    url += "Kit/Tradable/Non-Craftable/";
                                else if (title.conaints("Strangifier"))
                                    url += "Strangifier/Tradable/Craftable/";
                                else return alert(`[Unhandled Item]\n${title}`);
                                url += pIndex;
                            }
                        }
                        HTTPRequest("GET", url, e => {
                            var ele = document.createElement("html"),
                                hasListings,
                                str;
                            ele.innerHTML += e;
                            if (!extended)
                                hasListings = !ele.querySelector(".col-6 .alert-info");
                            else
                                hasListings = !ele.querySelector(".media-list .alert-info");
                            if (hasListings) {
                                var list = ele.querySelectorAll("[data-listing-price]"),
                                    lowest = list[0].getAttribute("data-listing-price"),
                                    normal = extended && !isKS && !paint,
                                    highest = list[normal ? 10 : list.length - 1].getAttribute("data-listing-price");
                                str = ` (${lowest} ~ ${highest} from ${normal ? 10 : list.length - 1} Listings)`;
                            } else
                                str = " (No listings found)";
                            if (isKS)
                                str += ` [${data.killstreak_tiers[tier].name} Killstreak]`;
                            else if (paint)
                                str += ` [Painted ${paint}]`;
                            document.getElementsByClassName("panel-heading")[1].textContent += str;
                            displayText("Loaded", false);
                        });
                    });
            }
        }
        console.info(`Backpack.tf Script Loaded. Version ${GM_info.script.version}`);
    } catch(e) {
        if (stat)
            displayText("Fatal Error");
        alert(`[A fatal error has occured]\n${e.message}\n[Stack Trace]\n${e.stack}`);
    }
})();