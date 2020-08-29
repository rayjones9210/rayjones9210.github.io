var audio = document.querySelector("audio");
const CUSTOM_CHANNEL = 'urn:x-cast:com.seed.intercom';
const context = cast.framework.CastReceiverContext.getInstance();
var playerManager = context.getPlayerManager();
var senderId;
//
const configuration = {
	'iceServers': [{
		'urls': 'stun:stun.l.google.com:19302' 
	}]
};
let peerConnection = new RTCPeerConnection(configuration);//receiving peer
const remoteStream = new MediaStream();
//
//audio.srcObject = remoteStream;
//
context.addCustomMessageListener(CUSTOM_CHANNEL, function (customEvent) {
	var messageCast = customEvent.data;
	if (messageCast.type === "OFFER") {
		senderId = customEvent.senderId;
		//
		var rtcSessionDescription = new RTCSessionDescription(messageCast.sdp);
		rtcSessionDescription.type = "offer";
		peerConnection.setRemoteDescription(rtcSessionDescription);
		//
		peerConnection.createAnswer().then(answer => {
			peerConnection.setLocalDescription(answer);
			//
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "ANSWER",
				"answer": answer
			});
		}).catch(error => {
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "ERROR",
				"message": error
			});
		});
		//
		configPeerConnection();
	} else if (messageCast.type === "START") {
		audio.srcObject = remoteStream;
		//
		context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
			"type": "STARTED"
		});
	} else if (messageCast.type === "STOP") {
		//
		remoteStream.getTracks().forEach(track => track.stop());
		//
		context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
			"type": "STOPPED"
		});
	} else if (messageCast.type === "ICE_CANDIDATE") {
		try {
			peerConnection.addIceCandidate(messageCast.iceCandidate);
		} catch (e) {
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "ERROR",
				"message": "Error adding received ice candidate" + e
			});
		}
	}
	//
	context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
		"type": "MESSAGE_RECEIVED",
		"senderId": customEvent.senderId,
		"message": messageCast
	});
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
			let e = new cast.framework.messages.ErrorData(cast.framework.messages.ErrorType
				.INVALID_REQUEST);
			e.reason = cast.framework.messages.ErrorReason.NOT_SUPPORTED;
			return e;
		}
		return seekData;
	});
//
playerManager.setSupportedMediaCommands(cast.framework.messages.Command.PAUSE | cast.framework.messages.Command.STREAM_VOLUME | cast.framework.messages.Command.STREAM_MUTE | cast.framework.messages.Command.STREAM_TRANSFER);
//
context.start();
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
			// Peers connected!
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