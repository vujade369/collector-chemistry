# Collector Chemistry — Multi-Wallet Spec

## Purpose

This document defines how Collector Chemistry should support collector profiles made from multiple wallets.

A collector can span more than one wallet.

The product should eventually support this without requiring wallet connection, verification, or identity inference.

---

## Why this exists

Many collectors use more than one wallet.

A single wallet address does not always represent a complete collector. Holdings may be split across:

- primary wallet
- vault wallet
- minting wallet
- trading wallet
- burner wallet
- old wallet
- artist wallet

When a profile only reads one wallet, the taste map may be incomplete, the archetype may be off, and the compare result may be weaker than it should be.

Multi-wallet support lets a collector build a more complete read of themselves.

---

## Core model

Collector Chemistry should distinguish between:

```txt
wallet = one address
collector = one or more wallets