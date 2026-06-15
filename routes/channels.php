<?php

use Illuminate\Support\Facades\Broadcast;

/*
 * Channel authorization. The transfer download channel is PUBLIC
 * (transfer.{slug}) so it needs no entry here — guests and signed-in senders
 * both receive download events without auth. Add private channels below if you
 * later need per-user authorization.
 */
