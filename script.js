window.onload=()=>{    
    const cb = document.querySelector('#step');
    const cbFam = document.querySelector('#family');
    const cbQty = document.querySelector('#qty');
	cb.addEventListener('change', plotChart);
    cbFam.addEventListener('change', plotChart);
    cbQty.addEventListener('change', plotChart);
    const cbTypes = [document.querySelector('#filterPres'), document.querySelector('#filterLegis'), document.querySelector('#filterEuro')];
    cbTypes.forEach((cbx) => cbx.addEventListener('change', plotChart));
    plotChart();
}

// Courant politiques
const PARTY_POOLS = ["Extrême gauche", "Gauche radicale", "Gauche", "Écologistes", "Centre-gauche", "Divers", "Centre", "Centre-droit", "Droite", "Droite souverainiste/radicale", "Extrême droite"];
// Lien entre courants et blocs
const POOLS_FAMILY = {
    "Extrême gauche": "Gauche",
    "Gauche radicale": "Gauche",
    "Gauche": "Gauche", 
    "Écologistes": "Gauche",
    "Centre-gauche": "Gauche",
    "Divers": "Centre",
    "Centre": "Centre",
    "Centre-droit": "Droite", 
    "Droite": "Droite", 
    "Droite souverainiste/radicale": "Droite",
    "Extrême droite": "Droite"
}
// Calendrier par type d'élection (rempli pendant l'exécution)
const CALENDAR = {
    "legis": [],
    "pres": [],
    "euro": [],
}
const TYPE_LABELS = {"legis": "Législatives", "pres" : "Présidentielles", "euro": "Européennes"}

function plotChart() {
    document.getElementById("chart").innerHTML = ''
    d3.json("data.json", {cache: "no-store"}).then(function(data) {

        // Switch 1er/2nd tour
        const cb = document.querySelector('#step');
        let stepFilter = cb.checked ? 2 : 1;
        // Switch courants/blocs
        const cbFam = document.querySelector('#family');
        // Switch %/abs
        const cbQty = document.querySelector('#qty');
        // Filtres élections
        const cbTypes = [document.querySelector('#filterPres'), document.querySelector('#filterLegis'), document.querySelector('#filterEuro')];

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
                const existingObj = acc.find(item => item.pool === obj.pool);
                if (existingObj) {
                  existingObj.name += '/' + obj.name;
                  existingObj.party += '/' + obj.party;
                  existingObj.res_100 += obj.res_100;
                  existingObj.res += obj.res;
                  existingObj.level.push(obj.level);
                  existingObj.family = POOLS_FAMILY[existingObj.pool]
                } else {
                  acc.push({
                    ...obj,
                    level: [obj.level],
                    family: POOLS_FAMILY[obj.pool]
                  });
                }
                return acc;
                }, []
            );
        });
        
        
        let selectedTypes = []
        cbTypes.forEach((cbx) => {console.log(cbx); if (cbx.checked) selectedTypes.push(cbx.value) });
        allRes = data.data
            .filter((elec) => elec.step == stepFilter || elec.step == 0)    // Switch tour
            .filter((elec) => selectedTypes.includes(elec.type) || selectedTypes.length === 0)
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
            width: 1800,
            height: 700,
            offset: cbQty.checked ? d3.stackOffsetNone : d3.stackOffsetExpand,
            yFormat: cbQty.checked ? null : "%"
        });
        // Ajout du graphique SVG à la page
        document.getElementById("chart").append(chart);
    })   
}

// Original baseline code:
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
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
    yFormat = "%", // a format specifier string for the y-axis
    // colors = d3.schemeTableau10, // an array of colors for the (z) categories
  } = {}) {
    // Compute values.
    const X = d3.map(data, x);
    const Y = d3.map(data, y);
    const Z = d3.map(data, z);

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
      .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));

    // Compute the default y-domain. Note: diverging stacks can be negative.
    if (yDomain === undefined) yDomain = d3.extent(series.flat(2));
  
    // Construct scales and axes.
    const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
    const color = d3.scaleOrdinal(
        origz.reverse(), 
        ["#bb0000", "#dd0000", "#FF8080", "#00c000", "#ffc0c0", "#FAC577", "#ffeb00", "#00FFFF", "#0066cc", "#adc1fd", "#404040"]
    );

    const xAxis = d3.axisBottom(xScale).ticks(width / 80, xFormat).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(height / 50, yFormat);
  
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
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  
    let electionDates = X.map(function (date) { return date.getTime() })
        .filter(function (date, i, array) {
            return array.indexOf(date) === i;
        })
        .map(function (time) { return new Date(time); });

    svg.append("g")
      .selectAll("path")
      .data(series)
      .join("path")
        .attr("fill", ([{i}]) => color(Z[i]))
        .attr("d", area)
      .append("title")
        .text(([{i}]) => Z[i]);
  
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove());
  
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
  
    //TODO: group in SVG <g> rather than iterating in JS
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
    })

    if (offset === d3.stackOffsetExpand) {
        svg.append("line")
        .attr("x1", 35)
        .attr("y1", (height/2)-5)
        .attr("x2", width-10)
        .attr("y2", (height/2)-5)
        .style("stroke-width", 1)
        .style("stroke-dasharray", ("3, 3"))
        .style("stroke", "black")
        .style("fill", "none");
    }
    return Object.assign(svg.node(), {scales: {color}});
  }