var audio = document.querySelector("audio")
var CUSTOM_CHANNEL = 'urn:x-cast:com.seed.intercom';
var context = cast.framework.CastReceiverContext.getInstance();
var playerManager = context.getPlayerManager();
let peerConnection; //receiving peer
var senderId;
const remoteStream = new MediaStream();
//
audio.srcObject = remoteStream;
window.onload = function () {
	context.addCustomMessageListener(CUSTOM_CHANNEL, function (customEvent) {
		var messageCast = customEvent.data;
		if (messageCast.type === "OFFER") {
			senderId = customEvent.senderId;
			//
			const configuration = {
				'iceServers': [{
					'urls': 'stun:stun.l.google.com:19302' | 'stun4.l.google.com:19302'
				}]
			}
			peerConnection = new RTCPeerConnection(configuration);
			//
			var rtcSessionDescription = new RTCSessionDescription(messageCast.sdp);
			rtcSessionDescription.type = "offer";
			peerConnection.setRemoteDescription(rtcSessionDescription);
			//
			const answer = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(answer);
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "ANSWER",
				"answer": answer
			});
			//
			configPeerConnection();
		} else if (messageCast.type === "START") {
			audio.srcObject = remoteStream;
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "STARTED"
			});
		} else if (messageCast.type === "STOP") {
			//
			remoteStream.getTracks().forEach(track => track.stop());
			context.sendCustomMessage(CUSTOM_CHANNEL, customEvent.senderId, {
				"type": "STOPPED"
			});
		} else if (messageCast.type == "ICE_CANDIDATE") {
			try {
				await peerConnection.addIceCandidate(messageCast.iceCandidate);
			} catch (e) {
				context.sendCustomMessage(CUSTOM_CHANNEL, senderId, {
					"type": "ERROR",
					"message": "Error adding received ice candidate" + e
				});
			}
		}
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
	//options
	var options = new cast.framework.CastReceiverOptions();
	options.customNamespaces = Object.assign({});
	options.customNamespaces[CUSTOM_CHANNEL] = cast.framework.system.MessageType.JSON;
	//
	context.start(options);
}

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
	});
}