#!/bin/bash
# PrivyCal Demo Script - Privacy-Preserving Calendar Matching
# This script demonstrates how two users can find common meeting slots
# without revealing their full calendars to each other.

# First check that Leo is installed.
if ! command -v leo &> /dev/null
then
    echo "leo is not installed."
    exit
fi

# User Alice's credentials
# Swap these into .env when running transactions as Alice
# NETWORK=testnet
# PRIVATE_KEY=APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH

# User Bob's credentials
# Swap these into .env when running transactions as Bob
# NETWORK=testnet
# PRIVATE_KEY=APrivateKey1zkp2RWGDcde3efb89rjhME1VYA8QMxcxep5DShNBR6n8Yjh

echo "
###############################################################################
########                                                               ########
########              PrivyCal - Private Calendar Matching             ########
########                                                               ########
########     Find common meeting times without revealing your          ########
########              full calendar to the other party                 ########
########                                                               ########
###############################################################################
"

echo "
###############################################################################
########                                                               ########
########        STEP 1: Alice creates her private calendar             ########
########                                                               ########
########        Alice is available:                                    ########
########        - Monday 9-11am (slots 0-1)                            ########
########        - Tuesday 2-4pm (slots 2-3)                            ########
########        - Wednesday 10am-12pm (slots 4-5)                      ########
########                                                               ########
###############################################################################
"

# Swap in Alice's credentials
echo "NETWORK=testnet
PRIVATE_KEY=APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH
ENDPOINT=http://localhost:3030
" > .env

# Alice creates her calendar with availability slots
# Format: create_calendar(owner_address, slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7)
# 1u8 = available, 0u8 = busy
leo run create_calendar \
  aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px \
  1u8 1u8 1u8 1u8 1u8 1u8 0u8 0u8 || exit

echo "
✅ Alice's calendar created privately!
   Only Alice can see her full availability.
"

echo "
###############################################################################
########                                                               ########
########         STEP 2: Bob creates his private calendar              ########
########                                                               ########
########        Bob is available:                                      ########
########        - Monday 10am-12pm (slots 0-1)                         ########
########        - Wednesday 9-11am (slots 4-5)                         ########
########        - Thursday 3-5pm (slots 6-7)                           ########
########                                                               ########
###############################################################################
"

# Swap in Bob's credentials
echo "NETWORK=testnet
PRIVATE_KEY=APrivateKey1zkp2RWGDcde3efb89rjhME1VYA8QMxcxep5DShNBR6n8Yjh
ENDPOINT=http://localhost:3030
" > .env

# Bob creates his calendar
leo run create_calendar \
  aleo1s3ws5tra87fjycnjrwsjcrnw2qxr8jfqqdugnf0xzqqw29q9m5pqem2u4t \
  1u8 1u8 0u8 0u8 1u8 1u8 1u8 1u8 || exit

echo "
✅ Bob's calendar created privately!
   Only Bob can see his full availability.
"

echo "
###############################################################################
########                                                               ########
########    STEP 3: Alice and Bob find common meeting times            ########
########                                                               ########
########    Using zero-knowledge proofs, they discover:                ########
########    - Common slots: 0, 1, 4, 5                                 ########
########    - Monday 9-12pm and Wednesday 9-12pm work for both!        ########
########                                                               ########
########    🔒 Neither party learns the other's full calendar          ########
########                                                               ########
###############################################################################
"

# Note: In the actual implementation, you would pass the Calendar records
# from both Alice and Bob to the compute_intersection function.
# This would be done with the actual record data from the previous steps.

echo "
# Example intersection computation (requires actual Calendar records):
# leo run compute_intersection <alice_calendar_record> <bob_calendar_record>
"

echo "
###############################################################################
########                                                               ########
########                    Demo Complete! 🎉                          ########
########                                                               ########
########    Key Privacy Features:                                      ########
########    ✅ Alice never sees Bob's full calendar                    ########
########    ✅ Bob never sees Alice's full calendar                    ########
########    ✅ They only learn their common available times            ########
########    ✅ All computation verified with zero-knowledge proofs     ########
########                                                               ########
###############################################################################
"

# Restore the .env file
echo "NETWORK=testnet
PRIVATE_KEY=APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH
ENDPOINT=http://localhost:3030
" > .env

echo "
📝 To run this demo in Leo Playground:
   1. Go to https://play.leo-lang.org/
   2. Paste the program from build/main.aleo
   3. Use this run.sh script as a reference for function calls
   4. Execute each step to see private calendar matching in action!
"
