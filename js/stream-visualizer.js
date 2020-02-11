function roundRect(ctx, x, y, width, height, radius, fill, stroke, alpha) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (alpha) {
        ctx.globalAlpha = alpha;
    }
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function getBezierXY(t, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey) {
    return {
        x: Math.pow(1-t,3) * sx + 3 * t * Math.pow(1 - t, 2) * cp1x
            + 3 * t * t * (1 - t) * cp2x + t * t * t * ex,
        y: Math.pow(1-t,3) * sy + 3 * t * Math.pow(1 - t, 2) * cp1y
            + 3 * t * t * (1 - t) * cp2y + t * t * t * ey
    };
}

const nodeByRef = (nodes, ref) => nodes.find(n => n.name === ref);
const findParentNodes = (nodes, ref) => nodes.filter(n => n.connections ?  n.connections.some(c => c.ref === ref) : false);

const getCurve = (startPos, endPos, nodeStartWidth, nodeEndWidth) => {
    const yDiff = Math.abs(startPos.y - endPos.y);
    const xDiff = Math.abs(startPos.x - endPos.x);

    let curve = {
        x: startPos.x,
        y: startPos.y + 80,
        cp1x: startPos.x,
        cp1y: startPos.y + 80 + yDiff / 4,
        cp2x: endPos.x,
        cp2y: endPos.y - yDiff / 4,
        ex: endPos.x,
        ey: endPos.y
    };

    // Nodes are side by side
    if (Math.abs(startPos.y - endPos.y) < 200) {
        if (startPos.x > endPos.x) {
            curve = {
                ...curve,
                x: startPos.x - nodeStartWidth / 2,
                y: startPos.y + 40,
                cp1x: startPos.x - nodeStartWidth / 2 - xDiff / 4,
                cp1y: startPos.y + 40,
                cp2x: endPos.x + nodeEndWidth / 2 + xDiff / 4,
                cp2y: endPos.y + 40,
                ex: endPos.x + nodeEndWidth / 2,
                ey: endPos.y + 40
            }
        } else {
            curve = {
                ...curve,
                x: startPos.x + nodeStartWidth / 2,
                y: startPos.y + 40,
                cp1x: startPos.x + nodeStartWidth / 2 + xDiff / 4,
                cp1y: startPos.y + 40,
                cp2x: endPos.x - nodeEndWidth / 2 - xDiff / 4,
                cp2y: endPos.y + 40,
                ex: endPos.x - nodeEndWidth / 2,
                ey: endPos.y + 40
            }
        }
    }
    // End node is above start node
    if (startPos.y - endPos.y > 200) {
        curve = {
            ...curve,
            y: startPos.y,
            cp1y: startPos.y - yDiff / 4,
            cp2y: endPos.y + 80 + yDiff / 4,
            ey: endPos.y + 80,
        };
        // End node is far to the right
        if (endPos.x - startPos.x > 400) {
            curve = {
                ...curve,
                ey: endPos.y + 40,
                ex: endPos.x - nodeEndWidth / 2,
                cp2y: endPos.y + 40,
                cp2x: endPos.x - nodeEndWidth / 2 - xDiff / 4
            }
        }
    }
    return curve;
};

const drawConnection = (ctx, nodeStart, nodeEnd, label, nodeStartWidth, nodeEndWidth) => {
    ctx.strokeStyle = '#3F8EE9';
    ctx.lineWidth = 5;
    const curve = getCurve(nodeStart, nodeEnd, nodeStartWidth, nodeEndWidth);

    ctx.moveTo(curve.x, curve.y);
    ctx.bezierCurveTo(curve.cp1x, curve.cp1y, curve.cp2x, curve.cp2y, curve.ex, curve.ey);
    ctx.stroke();

    if (label) {
        const pos = getBezierXY(0.5, curve.x, curve.y, curve.cp1x, curve.cp1y, curve.cp2x, curve.cp2y, curve.ex, curve.ey);
        ctx.fillStyle = '#3F8EE9';
        ctx.font = '40px monospace';
        ctx.fillText(label, pos.x + 50, pos.y + 10);
    }
};

const drawEmission = (ctx, nodeStart, nodeEnd, nodeStartWidth, nodeEndWidth) => {
    if (nodeStart.pos) {
        const curve = getCurve(nodeStart, nodeEnd, nodeStartWidth, nodeEndWidth);

        const streamPos = getBezierXY(nodeStart.pos, curve.x, curve.y, curve.cp1x, curve.cp1y, curve.cp2x, curve.cp2y, curve.ex, curve.ey);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(streamPos.x, streamPos.y, 20, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    }
}

const drawNode = (ctx, config, type, timestamp) => (node) => {
    ctx.font = "40px Ubuntu";
    const nodeWidth = ctx.measureText(node.text).width + 80;

    if (type === 'connections') {
        if (node.connections) {
            node.connections.forEach(c => {
                const endNode = nodeByRef(config.nodes, c.ref);
                ctx.font = "40px Ubuntu";
                const endNodeWidth = ctx.measureText(endNode.text).width + 80;
                drawConnection(ctx, node, nodeByRef(config.nodes, c.ref), c.label, nodeWidth, endNodeWidth);
            });
        }
    }

    if (type === 'emissions') {
        if (node.connections) {
            node.connections.forEach(c => {
                const endNode = nodeByRef(config.nodes, c.ref);
                ctx.font = "40px Ubuntu";
                const endNodeWidth = ctx.measureText(endNode.text).width + 80;
                drawEmission(ctx, node, nodeByRef(config.nodes, c.ref), nodeWidth, endNodeWidth);
            });
        }
    }

    if (type === 'nodes') {
        ctx.strokeStyle = '#3F8EE9';
        ctx.lineWidth = 5;
        ctx.fillStyle='#1C1D21';
        roundRect(ctx, node.x - nodeWidth / 2, node.y, nodeWidth, 80, 15, true, true );
        if (node.lastEmit) {
            const timeSince = timestamp - node.lastEmit;
            if (timeSince < 1000) {
                ctx.fillStyle='#3f8ee9';
                roundRect(ctx, node.x - nodeWidth / 2, node.y, nodeWidth, 80, 15, true, true, 1 - timeSince / 1000 );
                const expand = timeSince / 1000 * 50;
                roundRect(
                    ctx,
                    node.x - nodeWidth / 2 - expand / 2,
                    node.y - expand / 2,
                    nodeWidth + expand,
                    80 + expand,
                    15,
                    false,
                    true,
                    1 - timeSince / 1000
                );
            }
        }
        ctx.fillStyle='#fff';
        ctx.font = "40px Ubuntu";
        ctx.fillText(node.text, node.x - nodeWidth / 2 + 40, node.y + 55 );
    }
};

const nodeStep = (n, config, timestamp) => {
    let newPos = undefined;
    let emitConnections = undefined;
    if (n.pos !== undefined) {
        if (n.pos < 1.1) {
            newPos = n.pos + 0.01;
        } else {
            emitConnections = timestamp;
        }
    }
    let lastEmit = n.lastEmit;
    if (n.interval && timestamp > (n.delay || 0)) {
        if (lastEmit === undefined || timestamp - lastEmit > n.interval) {
            newPos = -0.1;
            lastEmit = timestamp
        }
    }
    let connectionTimestamp = n.connectionTimestamp;
    if (!n.end) {
        const parents = findParentNodes(config.nodes, n.name);
        if (parents) {
            parents.forEach(p => {
                if (p.emitConnections !== connectionTimestamp) {
                    newPos = -0.1;
                    connectionTimestamp = p.emitConnections;
                }
            });
        }
    }
    return {
        ...n,
        pos: newPos,
        lastEmit,
        emitConnections,
        connectionTimestamp
    }
};

const configStep = (config, timestamp) => {
    return {
        ...config,
        nodes: config.nodes.map(n => nodeStep(n, config, timestamp))
    }
};

const step = (ctx, config, canvas) => (timestamp) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    config.nodes.forEach(drawNode(ctx, config, 'connections', timestamp));
    config.nodes.forEach(drawNode(ctx, config, 'emissions', timestamp));
    config.nodes.forEach(drawNode(ctx, config, 'nodes', timestamp));
    window.requestAnimationFrame(step(ctx, configStep(config, timestamp), canvas));
};

window.initStreamVisualizer = (canvas, config) => {
  if (canvas.getContext) {
      canvas.width=config.width * 2;
      canvas.height=config.height * 2;
      canvas.style.width=`${config.width}px`;
      canvas.style.height=`${config.height}px`;
      const ctx = canvas.getContext('2d');

      window.requestAnimationFrame(step(ctx, config, canvas));
  }
};
