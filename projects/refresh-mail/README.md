# Refresh Mail — experimental read-only preview

An early standalone KaiOS 2.5 privileged app. The app connects directly to `imap.gmail.com:993` using `mozTCPSocket` with TLS and a Gmail app password. Credentials are held only in memory for login, not stored or logged; no third-party proxy is used. Two-step verification and an eligible Google account with an app password are required. Google Workspace administrators may restrict app passwords. See https://support.google.com/mail/answer/185833.

## Available

- Login with a Gmail address and app password; last 20 inbox messages, manual refresh, sign out.
- Plain-text mail and the first text/plain part of nested multipart mail; base64 and quoted-printable, basic encoded headers.
- Refresh appearance runtime and fonts are taken from the existing `refresh-connect` project at package time.

## Important limitations

**Not tested on a real phone or with a real Gmail account.** Do not add this preview to the public RStore catalog as a production app. KaiOS TCP/TLS availability and the installer must be verified on the target device. Test with a dedicated test account and revoke the app password afterwards. Passwords are not encrypted in memory while entered. Treat a device with this app open as having access to the mailbox.

Read-only: no composing, replying, sending, deletion, search, folders, attachments, HTML rendering, background sync, notifications or persistent sessions. Message bodies are limited to the first 64 KiB; some encodings and malformed MIME may not display. No Google Calendar, Contacts, Tasks, or Drive integration is implemented. An app password is not a general-purpose Google API token. Those services need a separately configured OAuth solution.

## Build and test

From the repo root, run:

```sh
node projects/refresh-mail/tests/imap.test.cjs
python3 projects/refresh-mail/scripts/package.py
```

The script produces `projects/refresh-mail/dist/refresh-mail-preview.zip`. It needs the checked-in Refresh runtime and fonts from `projects/refresh-connect`; Python 3 standard library and Node are sufficient. It does not publish to RStore or modify the catalog. Do not enter an ordinary Google account password; generate a separate app password and revoke it if necessary.
