const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
    name: "post",
    version: "1.5.0",
    role: 2,
    description: "Create a Facebook post with message and optional attachment.",
    hasPrefix: false,
    premium: false,
    credits: "developer",
    cooldowns: 5,
    category: "social"
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, attachments } = event;
    let postMessage = args.join(" ");
    let files = [];

    try {
        // Gather attachments from reply or direct message
        const allAttachments = messageReply?.attachments?.length
            ? messageReply.attachments
            : attachments || [];

        // Download all attachments
        for (const attachment of allAttachments) {
            const filePath = path.join(__dirname, "cache", attachment.filename);

            const fileResponse = await axios({
                url: attachment.url,
                method: "GET",
                responseType: "stream",
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            await fs.ensureDir(path.dirname(filePath));
            const writer = fs.createWriteStream(filePath);
            fileResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            files.push(fs.createReadStream(filePath));
        }

        const postData = { body: postMessage };
        if (files.length > 0) postData.attachment = files;

        // Attempt to create post
        api.createPost(postData)
            .then((url) => {
                api.sendMessage(
                    `✅ Post created successfully!\n🔗 ${url || "No URL returned."}`,
                    threadID,
                    messageID
                );
            })
            .catch((error) => {
                const errorUrl = error?.data?.story_create?.story?.url;
                if (errorUrl) {
                    return api.sendMessage(
                        `✅ Post created successfully!\n🔗 ${errorUrl}\n⚠️ (Note: Post created with server warnings)`,
                        threadID,
                        messageID
                    );
                }

                let errorMessage = "❌ An unknown error occurred.";
                if (error?.errors?.length > 0) {
                    errorMessage = error.errors.map(e => e.message).join("\n");
                } else if (error.message) {
                    errorMessage = error.message;
                }

                api.sendMessage(`❌ Error creating post:\n${errorMessage}`, threadID, messageID);
            })
            .finally(() => {
                // Clean up downloaded files
                files.forEach(file => {
                    if (file.path) {
                        fs.unlink(file.path).catch(err => {
                            if (err) console.error("❌ File delete error:", err);
                        });
                    }
                });
            });

    } catch (err) {
        console.error("❌ Error processing post:", err);
        api.sendMessage("❌ An error occurred while creating the post.", threadID, messageID);
    }
};