window.onload=()=>{    
    document.querySelectorAll('#headerPanel input[type=checkbox]').forEach((cbx) => cbx.addEventListener('change', plotChart));
    document.querySelectorAll('input[type=date]').forEach((dateInput) => dateInput.addEventListener('change', plotChart));
    document.querySelector('#displayLines').addEventListener('change', () => {
        document.getElementById("displayTicks").disabled = !document.getElementById("displayLines").checked;
    })
    plotChart();
}

// Courants politiques
const PARTY_POOLS = ["Extrême gauche", "Gauche radicale/communiste", "Gauche", "Gauche écologiste", "Centre-gauche", "Divers", "Centre", "Centre-droit", "Droite", "Droite souverainiste/radicale", "Extrême droite"];

// Calendrier par type d'élection (rempli pendant l'exécution)
const CALENDAR = {
    "legis": [],
    "pres": [],
    "euro": [],
}
const TYPE_LABELS = {"legis": "Législatives", "pres" : "Présidentielles", "euro": "Européennes"}
const FIRST_DATE = new Date("1965-01-01")
const LAST_DATE = new Date(); // Aujourd'hui

// Formatage français
const FR_LOCALE = d3.formatLocale({
    decimal: ",",
    thousands: " ",
    grouping: [3]
})

const numberFormat = FR_LOCALE.format(",");
const percentTickFormat = FR_LOCALE.format(".0%");
const percentExactFormat = FR_LOCALE.format(".2%");

width = 1800;
height = 700;

function plotChart() {
    document.querySelector("svg").innerHTML = ''
    d3.json("data.json", {cache: "no-store"}).then(function(data) {

        // Switch 1er/2nd tour
        const cbTour = document.querySelector('#step');
        let stepFilter = cbTour.checked ? 2 : 1;
        // Switch courants/blocs
        const cbFam = document.querySelector('#family');
        // Switch %/abs
        const cbQty = document.querySelector('#qty');
        // Filtres élections
        const cbTypes = [document.querySelector('#filterPres'), document.querySelector('#filterLegis'), document.querySelector('#filterEuro')];
        const cbYears = document.querySelector('#filterYear');
        const firstYearFilter = document.getElementById("startDate").value
        const lastYearFilter = document.getElementById("endDate").value

        data.data.forEach((elec) => {
            // Remplissage du calendrier
            CALENDAR[elec.type].push(elec.date);

            // Regroupement des courants politiques identiques
            // 1) On ajoute les courants manquants à toutes les élections
            PARTY_POOLS.filter(pool => !(elec.results.some(cand => cand.pool === pool))).forEach((missingPool) => {
                elec.results.push({
                    "name": "[Aucun]",
                    "res_100": 0,
                    "res": 0,
                    "party": "[Aucun]",
                    "pool": missingPool,
                    "level": -1
                })
            });
            // 2) On fusionne en additionnant les scores et en réunissant le reste
            // (On en profite aussi pour insérer le bloc politique global)
            elec.mergedResults = elec.results.reduce((acc, obj) => {
                const existingObj = acc.find(item => (cbFam.checked ? item.family === obj.family : item.pool === obj.pool));
                if (existingObj) {
                  existingObj.name += '/' + obj.name;
                  existingObj.party += '/' + obj.party;
                  existingObj.res_100 += obj.res_100;
                  existingObj.res += obj.res;
                  if (obj.coal) {
                    existingObj.coal.res_coal += obj.res
                    existingObj.coal.res_coal_100 += obj.res_100
                    newCoalArray = existingObj.coal.pool.concat(obj.coal)
                    existingObj.coal.pool = [...new Set(newCoalArray.flat())];
                  }
                  existingObj.level.push(obj.level);
                  existingObj.family = obj.family
                } else {
                  acc.push({
                    ...obj,
                    level: [obj.level],
                    coal: obj.coal ? {"res_coal": obj.res, "res_coal_100": obj.res_100, "pool": obj.coal}  : {"res_coal": 0, "res_coal_100": 0, "pool": []}
                  });
                }
                return acc;
                }, []
            );
        });
        
        
        let startDate = cbYears.checked ? new Date(firstYearFilter) : FIRST_DATE
        let endDate = cbYears.checked ? new Date(lastYearFilter) : LAST_DATE
        console.log(startDate, endDate)
        let selectedTypes = []
        cbTypes.forEach((cbx) => {if (cbx.checked) selectedTypes.push(cbx.value) });
        allRes = data.data
            .filter((elec) => elec.step == stepFilter || elec.step == 0)    // Switch tour
            .filter((elec) => selectedTypes.includes(elec.type))
            .filter((elec) => new Date(elec.date) >= startDate && new Date(elec.date) <= endDate)
            .map(elec => {
                // On insére la date de l'élection dans chaque résultat (car les résultats sont "aplatis")
                elec.mergedResults.forEach(res => {
                    res["date"] = elec.date
                });
                // On trie aussi sur un axe gauche-droite
                return elec.mergedResults.sort((a,b) => b.level - a.level);
            })
            .flat();

        // Création du graphique
        chart = StackedAreaChart(allRes, {
            x: res => d3.timeParse("%Y-%m-%d")(res.date),
            y: res => res.res,
            z: res => cbFam.checked ? res.family : res.pool,    // Switch courants/blocs
            zDomain:  PARTY_POOLS.reverse(),
            width: width,
            height: height,
            cbQty: cbQty,
            offset: cbQty.checked ? d3.stackOffsetNone : d3.stackOffsetExpand,
            // yFormat: cbQty.checked ? null : "%"
            yFormatFn: cbQty.checked ? numberFormat : d => percentTickFormat(d).replace("%", " %")
        });
        // Ajout du graphique SVG à la page
        document.getElementById("chart").append(chart);
    })   
}

// Original baseline code:
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// Copyright 2019–2021 Observable, Inc.
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
// https://observablehq.com/@d3/normalized-stacked-area-chart
function StackedAreaChart(data, {
    x = ([x]) => x, // given d in data, returns the (ordinal) x-value
    y = ([, y]) => y, // given d in data, returns the (quantitative) y-value
    z = () => 1, // given d in data, returns the (categorical) z-value
    marginTop = 20, // top margin, in pixels
    marginRight = 30, // right margin, in pixels
    marginBottom = 30, // bottom margin, in pixels
    marginLeft = 70, // left margin, in pixels
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    xType = d3.scaleUtc, // type of x-scale
    xDomain, // [xmin, xmax]
    xRange = [marginLeft, width - marginRight], // [left, right]
    yType = d3.scaleLinear, // type of y-scale
    yDomain, // [ymin, ymax]
    yRange = [height - marginBottom, marginTop], // [bottom, top]
    zDomain, // array of z-values
    offset = d3.stackOffsetExpand, // stack offset method
    order = d3.stackOrderNone, // stack order method
    yLabel, // a label for the y-axis
    xFormat, // a format specifier string for the x-axis
    yFormatFn, // a format specifier string for the y-axis
    // colors = d3.schemeTableau10, // an array of colors for the (z) categories
    cbQty, // checkbox absolu/pourcentage
  } = {}) {
    // Compute values.
    const X = d3.map(data, x);
    const Y = d3.map(data, y);
    const Z = d3.map(data, z);
    const coals = d3.map(data, (res) => res.coal)
    // Compute default x- and z-domains, and unique the z-domain.
    if (xDomain === undefined) xDomain = d3.extent(X);
    if (zDomain === undefined) zDomain = Z;
    
    let origz = zDomain;
    zDomain = new d3.InternSet(zDomain);
  
    // Omit any data not present in the z-domain.
    const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));
  
    // Compute a nested array of series where each series is [[y1, y2], [y1, y2],
    // [y1, y2], …] representing the y-extent of each stacked rect. In addition,
    // each tuple has an i (index) property so that we can refer back to the
    // original data point (data[i]). This code assumes that there is only one
    // data point for a given unique x- and z-value.
    const series = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => {
            if (Y[I.get(z)]) {
                return Y[I.get(z)];
            } else {
                return 0;
            }
        })
        .order(order)
        .offset(offset)
      (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
      .map(s => {
        newS = s.map(d => {
            let id = d.data[1].get(s.key)
            return Object.assign(d, {i: id, coal: coals[id]})
        })
        newS.key = s.key
        newS.index = s.index
        return newS
        });
    
    // Compute the default y-domain. Note: diverging stacks can be negative.
    if (yDomain === undefined) yDomain = d3.extent(series.flat(2));
  
    // Construct scales and axes.
    const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
    const color = d3.scaleOrdinal(
        origz.reverse(), 
        ["#bb0000", "#dd0000", "#FF8080", "#00c000", "#ffc0c0","#FAC577", "#ffeb00", "#00FFFF", "#0066cc", "#adc1fd", "#404040"]
    );

    const xAxis = d3.axisBottom(xScale).ticks(width / 80, xFormat).tickSizeOuter(0);
    // const yAxis = d3.axisLeft(yScale).ticks(height / 50, yFormat);
    const yAxis = d3.axisLeft(yScale).ticks(height / 50).tickFormat(yFormatFn);

    const area = d3.area()
        .curve(d3.curveMonotoneX)
        .x((point) =>  {
            let {i} = point
            if (i)
                return xScale(X[i])
            else {
                let newi = X.indexOf(point['data'][0])
                return xScale(X[newi])
            }
        } ) 
        .y0(([y1]) => yScale(y1))
        .y1(([, y2]) =>  yScale(y2))

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  
    let electionDates = X.map(function (date) { return date.getTime() })
    .filter(function (date, i, array) {
        return array.indexOf(date) === i;
    })
    .map(function (time) { return new Date(time); });

    // Définition des hachures coalitions
    svg.append('defs')
        .selectAll('pattern')
        .data(PARTY_POOLS)
        .enter()
        .append('pattern')
        .attr('id', function(_, i) {
            return 'diagonalHatch'+i;
        })
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('pool', ((p) => p))
        .attr('width', 10)
        .attr('height', 10)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2')
        .attr('stroke', ((p) => color(p)))
        .attr('stroke-width', 4);

    // Zones colorées
    const cbFam = document.querySelector('#family')
    svg.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("class","area")
        .attr("fill", ([{i}]) => color(Z[i]))
        .attr("d", area)
        .on("mouseover", function(d) {
            d3.select(this)
            .style("fill", ([{i}]) => d3.color(color(Z[i])).darker(0.35))
            .style("stroke", ([{i}]) => d3.color(color(Z[i])))
            .style("stroke-width", 6);
          })                  
        .on("mouseout", function(d) {
            d3.select(this)
            .style("fill", ([{i}]) => d3.color(color(Z[i])))
            .style("stroke", "transparent")
            .style("stroke-width", 0);
        })
        .call((g) => {
            g.each((pool, i, paths) => {
                pool.forEach((elecWithCoal) => {
                    if (!cbFam.checked && elecWithCoal.coal && elecWithCoal.coal.pool.length > 0) {
                        let mainParty = pool.key
                        let coalParty = elecWithCoal.coal.pool[0]       //TODO: coals with more than one pools
                        let downCoal = PARTY_POOLS.indexOf(coalParty) > PARTY_POOLS.indexOf(mainParty)
                        let whole = (elecWithCoal.coal.res_coal === Y[elecWithCoal.i])
                        let xCoal = xScale(X[elecWithCoal.i]), y0Coal = yScale(elecWithCoal[0]), y1Coal = yScale(elecWithCoal[1])
                        let yRadius = (y0Coal-y1Coal)/2,  yCenter = (y0Coal+y1Coal)/2, yRatio = elecWithCoal.coal.res_coal/Y[elecWithCoal.i];
                        
                        svg.append('ellipse')
                            .attr('cx', xCoal)
                            .attr('cy', downCoal ? (y0Coal-yRadius*yRatio/2) : (y1Coal+yRadius*yRatio/2))
                            .attr('ry', (y0Coal-y1Coal)*yRatio/4)
                            .attr('rx', 35)
                            .attr('class', 'areaCoal')
                            .attr("fill", "url(#diagonalHatch"+PARTY_POOLS.indexOf(coalParty)+")")
                            .style("opacity", 0.6)
                            .append("title")
                            .text("Coalition " + mainParty + " - " + coalParty)
                    }

                })
            })
        })
        .append("title")
        .text(([{i}]) => Z[i])

    // Paramètres d'affichage
    const cbLabels = document.querySelector('#displayLabel')
    const cbTicks = document.querySelector('#displayTicks')
    const cbLines = document.querySelector('#displayLines')

    // Labels des zones
    if (cbLabels.checked) {
        let labelSeries = series.map((pool) => {
            newPool = pool.map((elec) => {
                let newElec = elec.map((d) => d)
                newElec.data = {}
                zDomain.forEach((z) => {
                    newElec.data[z] = Y[elec.data[1].get(z)]
                })
                newElec.i = elec.i
                return newElec
            })
            newPool.key = pool.key
            newPool.index = pool.index
            return newPool
        });

        let labels = svg.select("g").selectAll('text#labels').data(labelSeries)
        labels.enter()
            .append('text')
            .attr('id', 'labels')
            .attr('class', 'area-label')
            .merge(labels)
            .text(([{i}]) => Z[i])
            .attr('transform', d3.areaLabel(area))
    }

    // Axe horizontal annoté
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove());

    // Axe vertical annoté
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line")
        .filter(d => d === 0 || d === 1)
        .clone()
            .attr("x2", width - marginLeft - marginRight))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(yLabel));

    // Lignes verticales de datation
    //TODO: group in SVG <g> rather than iterating in JS
    if (cbLines.checked) {
        electionDates.forEach((date) => {
            const offset = date.getTimezoneOffset()
            let newDate = new Date(date.getTime() - (offset*60*1000))
            let elecDate = newDate.toISOString().split('T')[0]
    
            const getElecType = (date) => Object.keys(CALENDAR).find(key => CALENDAR[key].includes(date));
            let lineColor;
            let elecType = getElecType(elecDate);
            switch (elecType) {
                case "pres":
                    lineColor = "red";
                    break;
                case "legis":
                    lineColor = "blue";
                    break;
                case "euro":
                    lineColor = "green";
                    break;
                default:
                    lineColor = "black";
            }
            let i = X.map(Number).indexOf(+date)
            var options = { year: "numeric", month: "long"};
            svg.append("line")
                .attr("x1", xScale(X[i]))
                .attr("y1", 0)
                .attr("x2", xScale(X[i]))
                .attr("y2", height-20)
                .style("stroke-width", 2)
                .style("stroke", lineColor)
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr("class", "elecLine")
                .on("mouseover", function() {
                    d3.select(this).style("stroke-width", 5);
                })
                .on("mouseout", function() {
                    d3.select(this).style("stroke-width", 2);       
                })
                .call(g => g.append("title")
                .text(TYPE_LABELS[elecType] + " - " + date.toLocaleDateString("fr-FR", options)))
            svg.append("text")
                    .attr("x", xScale(X[i]))
                    .attr("y", height)
                    .attr("fill", lineColor)
                    .attr("text-anchor", "middle")
                    .text(TYPE_LABELS[elecType][0])
        });
    }

    // Ligne médiane
    if (offset === d3.stackOffsetExpand) {
        svg.append("line")
        .attr("x1", 35)
        .attr("y1", (height/2)-5)
        .attr("x2", width-10)
        .attr("y2", (height/2)-5)
        .style("stroke-width", 2)
        .style("stroke-dasharray", ("3, 3"))
        .style("stroke", "black")
        .style("fill", "none");
    }


    // Interactivité
    if (cbTicks.checked) {
        // svg.append('rect')
        //   .attr('fill', 'transparent')
        //   .attr('x', 0)
        //   .attr('y', 0)
        //   .attr('width', width)
        //   .attr('height', height)
        // ;
        svg.selectAll('.elecLine').on('mouseover', hoverTicks);
        // svg.selectAll('.elecLine').on('mouseout', () => {svg.selectAll(".hoverPoint").remove(); svg.selectAll(".hoverText").remove(); svg.selectAll(".hoverTextBg").remove();})
        svg.selectAll('.elecLine').on('mouseout', () => {
            svg.selectAll(".hoverPoint, .hoverText, .hoverTextBg")
                .transition()
                .duration(300)
                .style("opacity", 0)
                .on("end", function() { d3.select(this).remove(); });
        });

        function hoverTicks(event) {
            event.preventDefault();
            const mouse = d3.pointer(event);
            const [
            xCoord,
            yCoord,
            ] = mouse;
        
            const mouseDateSnap = xScale.invert(xCoord);
            if (xScale(mouseDateSnap) < marginLeft ||
            xScale(mouseDateSnap) > width - marginRight) {
            return;
            }
            
            const bisectDate = d3.bisector(d => d.date).right;
            const xIndex = bisectDate(series, mouseDateSnap, 1);
            let dateInds = X.reduce((acc, d, ind) => {
                if (d.getMonth() === mouseDateSnap.getMonth() && d.getFullYear() === mouseDateSnap.getFullYear())
                    acc.push(ind);
                return acc;
            }, []); 
            const isLessThanHalf = xIndex > series.length / 2;

            dateInds.forEach((i) => {
                svg.append('circle').classed('hoverPoint', true).attr("id", "pt"+i);
                svg.append("text").classed('hoverText', true).attr("id", "txt"+i);
            });

            svg.selectAll('.hoverPoint').each((p,i,d) => {
                let id = d3.select(d[i]).attr("id").slice(2)
                let pool = series.find((p) => p.key === Z[id]);
                let point = pool.find((p) => p.i === parseInt(id));

                if ((point[1]-point[0]) > 0) {
                    d3.select(d[i])
                    .attr('cx', xScale(mouseDateSnap))
                    .attr('cy', yScale((point[0]+point[1])/2))
                    .attr('r', '7')
                    // .style("stroke", "black")
                    // .style("stroke-width", 1)
                    .attr('fill', d3.color(color(Z[id])))
                    .style("opacity", 0)  // Start invisible
                    .transition()
                    .duration(300)  // Fade-in duration (300ms)
                    .style("opacity", 1);
                }
            })

            let formerSmall = false; revert = false;
            
            let hoverLayer = svg.select(".hoverLayer");
            if (hoverLayer.empty()) {
                hoverLayer = svg.append("g").attr("class", "hoverLayer");
            }

            svg.selectAll('.hoverText').each((p,i,d) => {
                let id = d3.select(d[i]).attr("id").slice(3)
                let pool = series.find((p) => p.key === Z[id]);
                let point = pool.find((p) => p.i === parseInt(id));

                if ((point[1]-point[0]) > 0) { 
                    if ((point[1]-point[0]) < 0.02) {
                        if (formerSmall) {
                            revert = !revert;
                        } else {
                            revert = false;
                        }
                    } 
                    formerSmall = ((point[1]-point[0]) < 0.01)
                    
                    const hoverTextX = (isLessThanHalf || revert) ? '-0.75em' : '0.75em';
                    const hoverTextAnchor = (isLessThanHalf || revert) ? 'end' : 'start';

                    let textSelection = hoverLayer.append("text")
                        .attr("class", "hoverText")
                        .attr('x', xScale(mouseDateSnap))
                        .attr('y', yScale((point[0] + point[1]) / 2))
                        .attr('dx', hoverTextX)
                        .attr('dy', '0.35em')
                        .style('text-anchor', hoverTextAnchor)
                        .attr('fill', d3.color(color(Z[id])))
                        .text(Z[id] + " : " + (cbQty.checked 
                            ? numberFormat(point[1] - point[0])
                            : percentExactFormat(point[1] - point[0]).replace("%", " %")
                        ))
                        .style("opacity", 0)
                        .transition()
                        .duration(300)
                        .style("opacity", 1);

                    let bbox = textSelection.node().getBBox();
                    hoverLayer.insert("rect", ".hoverText")
                        .attr("class", "hoverTextBg")
                        .attr("x", bbox.x - 4)
                        .attr("y", bbox.y - 2)
                        .attr("width", bbox.width + 8)
                        .attr("height", bbox.height + 4)
                        .attr("fill", "rgba(0,0,0, 0.2)")
                        .attr("rx", 4)
                        .attr("ry", 4)
                        .style("opacity", 0)
                        .transition()
                        .duration(300)
                        .style("opacity", 1);
                }
            });

        };
    }



    return Object.assign(svg.node(), {scales: {color}});
}