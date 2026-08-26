const CONFIG = {
  originalPath: "assets/IMG_2563.PNG",
  earlyFragmentPath: "assets/IMG_2565.PNG",
  lateFragmentPath: "assets/IMG_2566.PNG",
  maxPictureWidth: 720,
  gapAmount: 18,
  settleMs: 620,
  glowBlur: 30,
  particlesPerSplit: 70,
  particleLifeMin: 650,
  particleLifeMax: 1500,
  lateCropWidthMin: 0.82,
  lateCropWidthMax: 1,
  background: "#160305"
};

const GLITCH_WORDS = ["宝宝", "我爱你", "Mom", "I Love You", "喜欢", "好饿", "想要吃掉", "喜欢你"];
const ZALGO_MARKS = ["\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0308", "\u030a", "\u030b", "\u0315", "\u0316", "\u0317", "\u0323", "\u0324", "\u0334", "\u0335", "\u0336", "\u0358", "\u0360"];

let originalTexture;
let earlyFragmentTexture;
let lateFragmentTexture;
let pictureRect;
let pieces = [];
let particles = [];
let glitchTexts = [];
let fractured = false;
let splitCount = 0;
let lastInteractionAt = -Infinity;
let loadingState = "正在加载柊野…";

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("app");
  pixelDensity(1);
  updatePictureRect();
  loadAssets();
}

function loadAssets() {
  Promise.all([
    loadImage(CONFIG.originalPath),
    loadImage(CONFIG.earlyFragmentPath),
    loadImage(CONFIG.lateFragmentPath)
  ]).then(([original, early, late]) => {
    originalTexture = original;
    earlyFragmentTexture = early;
    lateFragmentTexture = late;
    loadingState = "";
  }).catch(() => {
    loadingState = "素材加载失败，请刷新页面";
  });
}

function draw() {
  background(CONFIG.background);
  if (loadingState) {
    drawStatus(loadingState);
    return;
  }

  drawBackdrop();
  if (!fractured) {
    drawContainedTexture(originalTexture);
    drawPictureFrame();
  } else {
    updateParticles();
    drawParticles();
    drawOverlapWhiteLight();
    for (const piece of pieces) drawGlow(piece);
    for (const piece of pieces) drawPiece(piece);
  }
  updateGlitchTexts();
  drawGlitchTexts();
  drawHint();
}

function drawStatus(message) {
  fill(255, 224, 220);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  text(message, width / 2, height / 2);
}

function mousePressed() {
  handleInteraction(mouseX, mouseY);
  return false;
}

function touchStarted() {
  const finger = touches[0];
  if (finger) handleInteraction(finger.x, finger.y);
  return false;
}

function touchMoved() {
  return false;
}

function touchEnded() {
  return false;
}

function handleInteraction(inputX, inputY) {
  if (millis() - lastInteractionAt < 350) return;
  lastInteractionAt = millis();
  if (loadingState) return;

  if (!fractured && insidePicture(inputX, inputY)) {
    const splitResult = splitPolygonNearClick(rectangleVertices(), inputX, inputY);
    if (splitResult) commitSplit(splitResult, -1, inputX, inputY);
    return;
  }

  const selectedIndex = pieces.findIndex(piece => pointInPolygon(inputX, inputY, currentVertices(piece)));
  if (selectedIndex === -1) return;
  const splitResult = splitPolygonNearClick(currentVertices(pieces[selectedIndex]), inputX, inputY);
  if (splitResult) commitSplit(splitResult, selectedIndex, inputX, inputY);
}

function updatePictureRect() {
  let pictureWidth = min(CONFIG.maxPictureWidth, width - 64);
  let pictureHeight = pictureWidth * 3 / 4;
  if (pictureHeight > height - 110) {
    pictureHeight = height - 110;
    pictureWidth = pictureHeight * 4 / 3;
  }
  pictureRect = {
    x: width / 2 - pictureWidth / 2,
    y: height / 2 - pictureHeight / 2,
    width: pictureWidth,
    height: pictureHeight
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updatePictureRect();
  resetSketch();
}

function keyPressed() {
  if (key === "r" || key === "R") resetSketch();
}

function resetSketch() {
  pieces = [];
  particles = [];
  glitchTexts = [];
  fractured = false;
  splitCount = 0;
  lastInteractionAt = -Infinity;
}

function rectangleVertices() {
  return [
    { x: pictureRect.x, y: pictureRect.y },
    { x: pictureRect.x + pictureRect.width, y: pictureRect.y },
    { x: pictureRect.x + pictureRect.width, y: pictureRect.y + pictureRect.height },
    { x: pictureRect.x, y: pictureRect.y + pictureRect.height }
  ];
}

function commitSplit(polygons, replacedIndex, originX, originY) {
  const parentVertices = replacedIndex === -1 ? rectangleVertices() : currentVertices(pieces[replacedIndex]);
  const parentCenter = polygonCentroid(parentVertices);
  const newPieces = polygons.map(vertices => makePiece(vertices, parentCenter, replacedIndex === -1));
  if (replacedIndex === -1) {
    pieces = newPieces;
    fractured = true;
  } else {
    pieces.splice(replacedIndex, 1, ...newPieces);
  }
  splitCount++;
  if (splitCount >= 6) {
    for (const piece of pieces) piece.lateCrop = makeRandomLateCrop();
  }
  spawnParticles(newPieces);
  spawnGlitchTexts(originX, originY);
}

function splitPolygonNearClick(vertices, inputX, inputY) {
  const center = polygonCentroid(vertices);
  const xOffset = inputX - center.x;
  const yOffset = inputY - center.y;
  const clickMagnitude = max(1, Math.hypot(xOffset, yOffset));
  const limitedMagnitude = min(clickMagnitude, min(pictureRect.width, pictureRect.height) * 0.15);
  const cutOrigin = {
    x: center.x + xOffset / clickMagnitude * limitedMagnitude,
    y: center.y + yOffset / clickMagnitude * limitedMagnitude
  };
  const parentArea = polygonArea(vertices);
  for (let attempt = 0; attempt < 10; attempt++) {
    const angle = random(TWO_PI);
    const direction = { x: cos(angle), y: sin(angle) };
    const firstPiece = clipPolygonByLine(vertices, cutOrigin, direction, true);
    const otherPiece = clipPolygonByLine(vertices, cutOrigin, direction, false);
    if (firstPiece.length >= 3 && otherPiece.length >= 3 &&
        polygonArea(firstPiece) > parentArea * 0.09 && polygonArea(otherPiece) > parentArea * 0.09) {
      return [firstPiece, otherPiece];
    }
  }
  return null;
}

function clipPolygonByLine(vertices, origin, direction, keepPositive) {
  const result = [];
  for (let index = 0; index < vertices.length; index++) {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    const fromSide = signedCutSide(from, origin, direction);
    const toSide = signedCutSide(to, origin, direction);
    const fromInside = keepPositive ? fromSide >= -0.001 : fromSide <= 0.001;
    const toInside = keepPositive ? toSide >= -0.001 : toSide <= 0.001;
    if (fromInside) result.push({ x: from.x, y: from.y });
    if (fromInside !== toInside) {
      const ratio = fromSide / (fromSide - toSide);
      result.push({ x: lerp(from.x, to.x, ratio), y: lerp(from.y, to.y, ratio) });
    }
  }
  return result;
}

function signedCutSide(vertexData, origin, direction) {
  return direction.x * (vertexData.y - origin.y) - direction.y * (vertexData.x - origin.x);
}

function makePiece(vertices, parentCenter, initialSplit) {
  const center = polygonCentroid(vertices);
  let outwardX = center.x - parentCenter.x;
  let outwardY = center.y - parentCenter.y;
  const outwardMagnitude = max(0.001, Math.hypot(outwardX, outwardY));
  outwardX /= outwardMagnitude;
  outwardY /= outwardMagnitude;
  if (outwardMagnitude < 0.01) {
    const randomAngle = random(TWO_PI);
    outwardX = cos(randomAngle);
    outwardY = sin(randomAngle);
  }
  const separationDistance = initialSplit ?
    random(CONFIG.gapAmount * 0.32, CONFIG.gapAmount * 0.5) :
    random(CONFIG.gapAmount * 0.18, CONFIG.gapAmount * 0.38);
  return {
    vertices,
    center,
    offset: { x: outwardX * separationDistance, y: outwardY * separationDistance },
    finalAngle: random(-(initialSplit ? 0.028 : 0.012), initialSplit ? 0.028 : 0.012),
    lateCrop: null,
    startAt: millis()
  };
}

function pieceMotion(piece) {
  const elapsed = constrain((millis() - piece.startAt) / CONFIG.settleMs, 0, 1);
  const travel = 1 - exp(-elapsed * 7) * (1 + 0.18 * sin(elapsed * 20));
  return {
    x: piece.offset.x * travel,
    y: piece.offset.y * travel,
    angle: (1 - exp(-elapsed * 6)) * piece.finalAngle
  };
}

function currentVertices(piece) {
  const motion = pieceMotion(piece);
  const cosine = cos(motion.angle);
  const sine = sin(motion.angle);
  return piece.vertices.map(vertexData => {
    const xOffset = vertexData.x - piece.center.x;
    const yOffset = vertexData.y - piece.center.y;
    return {
      x: piece.center.x + motion.x + xOffset * cosine - yOffset * sine,
      y: piece.center.y + motion.y + xOffset * sine + yOffset * cosine
    };
  });
}

function drawPiece(piece) {
  const vertices = currentVertices(piece);
  const context = drawingContext;
  context.save();
  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  for (let index = 1; index < vertices.length; index++) context.lineTo(vertices[index].x, vertices[index].y);
  context.closePath();
  context.clip();
  context.globalAlpha = 0.96;
  if (splitCount >= 6) drawRandomCrop(lateFragmentTexture, piece.lateCrop);
  else drawContainedTexture(earlyFragmentTexture);
  context.restore();
  noFill();
  stroke(255, 242, 236, 170);
  strokeWeight(1.25);
  drawPolygon(vertices);
}

function drawGlow(piece) {
  const vertices = currentVertices(piece);
  const context = drawingContext;
  push();
  blendMode(ADD);
  context.save();
  context.shadowBlur = CONFIG.glowBlur;
  context.shadowColor = "rgba(255, 40, 42, .92)";
  fill(255, 28, 34, 20);
  stroke(255, 245, 235, 105);
  strokeWeight(3.6);
  drawPolygon(vertices);
  context.restore();
  blendMode(LIGHTEST);
  context.save();
  context.shadowBlur = CONFIG.glowBlur * 0.6;
  context.shadowColor = "rgba(255, 245, 235, .82)";
  noFill();
  stroke(255, 236, 230, 115);
  strokeWeight(1.8);
  drawPolygon(vertices);
  context.restore();
  blendMode(BLEND);
  pop();
}

function drawOverlapWhiteLight() {
  push();
  blendMode(ADD);
  noStroke();
  fill(255, 250, 246, 15);
  for (const piece of pieces) drawPolygon(currentVertices(piece));
  blendMode(BLEND);
  pop();
}

function drawContainedTexture(texture) {
  const textureScale = min(pictureRect.width / texture.width, pictureRect.height / texture.height);
  const drawWidth = texture.width * textureScale;
  const drawHeight = texture.height * textureScale;
  image(texture, pictureRect.x + (pictureRect.width - drawWidth) / 2,
    pictureRect.y + (pictureRect.height - drawHeight) / 2, drawWidth, drawHeight);
}

function makeRandomLateCrop() {
  const targetAspect = pictureRect.width / pictureRect.height;
  let sourceWidth = random(lateFragmentTexture.width * CONFIG.lateCropWidthMin,
    lateFragmentTexture.width * CONFIG.lateCropWidthMax);
  let sourceHeight = sourceWidth / targetAspect;
  if (sourceHeight > lateFragmentTexture.height) {
    sourceHeight = lateFragmentTexture.height;
    sourceWidth = sourceHeight * targetAspect;
  }
  return {
    x: random(0, lateFragmentTexture.width - sourceWidth),
    y: random(0, lateFragmentTexture.height - sourceHeight),
    width: sourceWidth,
    height: sourceHeight
  };
}

function drawRandomCrop(texture, crop) {
  image(texture, pictureRect.x, pictureRect.y, pictureRect.width, pictureRect.height,
    crop.x, crop.y, crop.width, crop.height);
}

function spawnParticles(newPieces) {
  for (let index = 0; index < CONFIG.particlesPerSplit; index++) {
    const piece = random(newPieces);
    const edgePoint = randomPointOnPolygonEdge(piece.vertices);
    const outwardAngle = atan2(edgePoint.y - piece.center.y, edgePoint.x - piece.center.x) + random(-0.85, 0.85);
    const lifetime = random(CONFIG.particleLifeMin, CONFIG.particleLifeMax);
    particles.push({
      x: edgePoint.x + random(-3, 3),
      y: edgePoint.y + random(-3, 3),
      vx: cos(outwardAngle) * random(0.7, 4.2),
      vy: sin(outwardAngle) * random(0.7, 4.2),
      size: random(1.4, 5.2),
      red: random() < 0.7,
      life: lifetime,
      maxLife: lifetime
    });
  }
  particles = particles.slice(-420);
}

function randomPointOnPolygonEdge(vertices) {
  const startIndex = floor(random(vertices.length));
  const start = vertices[startIndex];
  const end = vertices[(startIndex + 1) % vertices.length];
  const ratio = random();
  return { x: lerp(start.x, end.x, ratio), y: lerp(start.y, end.y, ratio) };
}

function updateParticles() {
  const step = min(2, deltaTime / 16.667);
  particles = particles.filter(particle => {
    particle.life -= deltaTime;
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.vx *= pow(0.965, step);
    particle.vy *= pow(0.965, step);
    return particle.life > 0;
  });
}

function drawParticles() {
  const context = drawingContext;
  push();
  blendMode(ADD);
  context.save();
  context.shadowBlur = 12;
  for (const particle of particles) {
    const alpha = 180 * sq(particle.life / particle.maxLife);
    context.shadowColor = particle.red ? "rgba(255, 35, 38, .9)" : "rgba(255, 245, 235, .9)";
    noStroke();
    fill(particle.red ? color(255, 38, 42, alpha) : color(255, 242, 236, alpha));
    circle(particle.x, particle.y, particle.size);
  }
  context.restore();
  blendMode(BLEND);
  pop();
}

function spawnGlitchTexts(originX, originY) {
  const density = min(8, 1 + floor(splitCount / 2));
  for (let index = 0; index < density; index++) {
    const lifetime = random(850, 1750);
    glitchTexts.push({
      value: makeZalgoText(random(GLITCH_WORDS), min(7, 2 + floor(splitCount / 2))),
      x: originX + random(-42, 42),
      y: originY + random(-34, 34),
      size: random(14, 25),
      red: random() < 0.72,
      life: lifetime,
      maxLife: lifetime
    });
  }
  glitchTexts = glitchTexts.slice(-120);
}

function makeZalgoText(sourceText, markCount) {
  let output = "";
  for (const symbol of sourceText) {
    output += symbol;
    for (let index = 0; index < markCount; index++) output += random(ZALGO_MARKS);
  }
  return output;
}

function updateGlitchTexts() {
  glitchTexts = glitchTexts.filter(item => (item.life -= deltaTime) > 0);
}

function drawGlitchTexts() {
  const shake = min(7, 0.8 + splitCount * 0.55);
  const flashChance = min(0.96, 0.5 + splitCount * 0.045);
  push();
  blendMode(ADD);
  textAlign(CENTER, CENTER);
  for (const item of glitchTexts) {
    if (random() > flashChance) continue;
    noStroke();
    fill(item.red ? color(255, 38, 42, 225 * sq(item.life / item.maxLife)) : color(255, 244, 238, 225 * sq(item.life / item.maxLife)));
    textSize(item.size);
    text(item.value, item.x + random(-shake, shake), item.y + random(-shake, shake));
  }
  blendMode(BLEND);
  pop();
}

function drawBackdrop() {
  noStroke();
  for (let index = 0; index < 5; index++) {
    fill(120, 0, 18, 9);
    circle(width * 0.5 + sin(frameCount * 0.006 + index) * width * 0.32, height * 0.5, 330 + index * 180);
  }
}

function drawPictureFrame() {
  noFill();
  stroke(255, 234, 225, 175);
  strokeWeight(1.4);
  rect(pictureRect.x, pictureRect.y, pictureRect.width, pictureRect.height);
}

function drawHint() {
  noStroke();
  fill(255, 224, 220, 155);
  textAlign(CENTER, CENTER);
  textSize(13);
  const message = fractured ? `successful splits: ${splitCount}  ·  click a fragment  ·  R resets` : "click the image to split it";
  text(message, width / 2, height - 28);
}

function drawPolygon(vertices) {
  beginShape();
  for (const vertexData of vertices) vertex(vertexData.x, vertexData.y);
  endShape(CLOSE);
}

function pointInPolygon(inputX, inputY, vertices) {
  let inside = false;
  for (let current = 0, previous = vertices.length - 1; current < vertices.length; previous = current++) {
    const a = vertices[current];
    const b = vertices[previous];
    if ((a.y > inputY) !== (b.y > inputY) &&
        inputX < (b.x - a.x) * (inputY - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function polygonCentroid(vertices) {
  let totalX = 0;
  let totalY = 0;
  for (const vertexData of vertices) {
    totalX += vertexData.x;
    totalY += vertexData.y;
  }
  return { x: totalX / vertices.length, y: totalY / vertices.length };
}

function polygonArea(vertices) {
  let total = 0;
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    total += a.x * b.y - b.x * a.y;
  }
  return abs(total) * 0.5;
}

function insidePicture(inputX, inputY) {
  return inputX >= pictureRect.x && inputX <= pictureRect.x + pictureRect.width &&
    inputY >= pictureRect.y && inputY <= pictureRect.y + pictureRect.height;
}
