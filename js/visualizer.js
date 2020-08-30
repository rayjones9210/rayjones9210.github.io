var canvas, ctx, center_x, center_y, radius, bars, 
x_end, y_end, bar_height, bar_width,
frequency_array;
bars = 200;
bar_width = 2;
function initPage(){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
	source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    frequency_array = new Uint8Array(analyser.frequencyBinCount);
    animationLooper();
}
function animationLooper(){
    // set to the size of device
    canvas = document.getElementById("renderer");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext("2d");
    // find the center of the window
    center_x = canvas.width / 2;
    center_y = canvas.height / 2;
    radius = 150;
    //draw a circle
    ctx.beginPath();
    ctx.arc(center_x,center_y,radius,0,2*Math.PI);
    ctx.stroke();
    
    analyser.getByteFrequencyData(frequency_array);
    for(var i = 0; i < bars; i++){
        
        //divide a circle into equal parts
        rads = Math.PI * 2 / bars;
        
        bar_height = frequency_array[i]*0.7;
        
        // set coordinates
        x = center_x + Math.cos(rads * i) * (radius);
	y = center_y + Math.sin(rads * i) * (radius);
        x_end = center_x + Math.cos(rads * i)*(radius + bar_height);
        y_end = center_y + Math.sin(rads * i)*(radius + bar_height);
        
        //draw a bar
        drawBar(x, y, x_end, y_end, bar_width,frequency_array[i]);
    
    }
    window.requestAnimationFrame(animationLooper);
}
function drawBar(x1, y1, x2, y2, width,frequency){
    
    var lineColor = "rgb(" + frequency + ", " + frequency + ", " + 205 + ")";
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}
initPage();