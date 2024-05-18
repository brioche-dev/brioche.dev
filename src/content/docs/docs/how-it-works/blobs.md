---
title: Blobs
---

A **blob** is a bag of bytes, which is used as a low-level building block in Brioche. It's rare to interact with blobs directly. Instead, blobs are most commonly used by [file artifacts](./artifacts#files) to represent the file's contents. Two files can refer to the same blob but differ by their metadata.

Blobs have no metadata, and are identified by the [BLAKE3](https://blake3.io/) hash of their contents.
