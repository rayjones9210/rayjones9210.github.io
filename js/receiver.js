const CUSTOM_CHANNEL = 'urn:x-cast:com.seed.intercom';
var audio = document.querySelector("#audio");
var context = cast.framework.CastReceiverContext.getInstance();
var senderId;
var playerManager = context.getPlayerManager();
//
const configuration = {};
let peerConnection = new RTCPeerConnection(configuration);//receiving peer
const remoteStream = new MediaStream();
//
context.addCustomMessageListener(CUSTOM_CHANNEL, function (customEvent) {
	var messageCast = customEvent.data;
		senderId = customEvent.senderId;
	if (messageCast.type === "OFFER") {
		//
		var rtcSessionDescription = new RTCSessionDescription({"type": "offer", "sdp":messageCast.sdp});
		peerConnection.setRemoteDescription(rtcSessionDescription);
		//
		peerConnection.createAnswer().then(answer => {
			peerConnection.setLocalDescription(answer);
			//
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ANSWER",
				"answer": answer
			});
		}).catch(error => {
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ERROR",
				"message": "Could not create answer " + error
			});
		});
		//
		configPeerConnection();
	} else if (messageCast.type === "START") {
		try {
			audio.srcObject = remoteStream;
			audio.play();
			//
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "STARTED"
			});
		}
		catch(e)
		{
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ERROR",
				"message": "Could not set audio source object " + e
			});
		}
	} else if (messageCast.type === "STOP") {
		//
		try {
			audio.pause();
			remoteStream.getTracks().forEach(track => track.stop());
			//
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "STOPPED"
			});
		}
		catch(e)
		{
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ERROR",
				"message": "Could not stop audio element from playing " + e
			});
		}
	} else if (messageCast.type === "ICE_CANDIDATE") {
		try {
			peerConnection.addIceCandidate(messageCast.iceCandidate);
		} catch (e) {
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ERROR",
				"message": "Error adding received ice candidate" + e
			});
		}
	}
	//
});
//
playerManager.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, loadRequestData => {
	return null;
});
//
playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PLAY, loadRequestData => {
	return null;
});
//
playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PAUSE, loadRequestData => {
	return null;
});
//
playerManager.setMessageInterceptor(cast.framework.messages.MessageType.STOP, loadRequestData => {
	return null;
});
//
playerManager.setMessageInterceptor(cast.framework.messages.MessageType.SEEK,
	seekData => {
		// Block seeking if the SEEK supported media command is disabled
		if (!(playerManager.getSupportedMediaCommands() & cast.framework.messages.Command.SEEK)) {
			let e = new cast.framework.messages.ErrorData(cast.framework.messages.ErrorType.INVALID_REQUEST);
			e.reason = cast.framework.messages.ErrorReason.NOT_SUPPORTED;
			return e;
		}
		return seekData;
	});
//
playerManager.setSupportedMediaCommands(cast.framework.messages.Command.PAUSE | cast.framework.messages.Command.STREAM_VOLUME | cast.framework.messages.Command.STREAM_MUTE | cast.framework.messages.Command.STREAM_TRANSFER);
//
const options = new cast.framework.CastReceiverOptions();
options.maxInactivity = 1800; //Max streaming time in seconds
//
context.start(options);
//
function configPeerConnection() {
	// Listen for local ICE candidates on the local RTCPeerConnection
	peerConnection.addEventListener('icecandidate', event => {
		if (event.candidate) {
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "ICE_CANDIDATE",
				"iceCandidate": event.candidate
			});
		}
	});
	// Listen for connectionstatechange on the local RTCPeerConnection
	peerConnection.addEventListener('connectionstatechange', event => {
		if (peerConnection.connectionState === 'connected') {
			context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "STATUS",
				"message": "Peer Connected"
			});
		}
	});
	//Add remote track from Calling Peer
	peerConnection.addEventListener('track', async(event) => {
		remoteStream.addTrack(event.track, remoteStream);
		context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
				"type": "STATUS",
				"message": "Remote track added"
			});
	});
}