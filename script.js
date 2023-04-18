window.onload=()=>{

    const cb = document.querySelector('#step');
	cb.addEventListener('change', plotChart);
    plotChart();
}

const PARTY_POOLS = ["Extrême gauche", "Gauche radicale", "Gauche", "Écologistes", "Centre-gauche", "Divers", "Centre", "Centre-droit", "Droite", "Droite souverainiste", "Extrême droite"];

function plotChart() {
    document.getElementById("chart").innerHTML = ''
    d3.json("data.json", {cache: "no-store"}).then(function(data) {

        const cb = document.querySelector('#step');
        let stepFilter = cb.checked ? 2 : 1;
        data.data.forEach((elec) => {
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
        });
        allRes = data.data.filter((elec) => elec.step == stepFilter).map(elec => {
            elec.results.forEach(res => {
                res["date"] = elec.date
            });
            return elec.results.sort((a,b) => b.level - a.level);
        }).flat();
        chart = StackedAreaChart(allRes, {
            x: res => d3.timeParse("%Y-%m-%d")(res.date),
            y: res => res.res_100,
            z: res => res.pool,
            yLabel: "↑ Résultat",
            zDomain:  PARTY_POOLS.reverse(),
            width: 1200,
            height: 800
        });
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
    marginLeft = 40, // left margin, in pixels
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
    // console.log("XYZ:", X, Y, Z)

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
  
    return Object.assign(svg.node(), {scales: {color}});
  }