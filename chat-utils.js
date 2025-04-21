function sendMessage(client, event, response, ignoreRef) {
    const ref = ignoreRef ? [] :
        [
            {
                message_id: '',
                message_ref_id: event.message_id,
                ref_type: 0,
                message_sender_id: event.sender_id,
                message_sender_username: event.username,
                mesages_sender_avatar: event.avatar,
                message_sender_clan_nick: event.clan_nick,
                message_sender_display_name: event.display_name,
                content: JSON.stringify(event.content),
                has_attachment: false,
            },
        ]

    client.sendMessage(
        event?.clan_id,
        event?.channel_id,
        2,
        event?.is_public,
        response,
        [],
        [],
        ref
    );
}

function sendMessageString(client, event, message, isMarkdown, ignoreRef) {
    const response = isMarkdown ?
        {
            t: message,
            mk: [
                {
                    "type": "t",
                    "s": 0,
                    "e": message.length,
                }
            ]
        } : { t: message };

    sendMessage(client, event, response, ignoreRef);
}

module.exports = {
    sendMessageString,
    sendMessage
}