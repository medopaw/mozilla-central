/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#define DEBUGGING
#ifdef DEBUGGING
#if defined(MOZ_WIDGET_GONK)
#include <android/log.h>
#define FILESYSTEM_LOG(args...)  __android_log_print(ANDROID_LOG_INFO, "SDCard" , ## args)
#else
#define FILESYSTEM_LOG(fmt, ...) printf("\n"); printf(fmt, ##__VA_ARGS__); printf("\n")
#endif
#else
#define FILESYSTEM_LOG(fmt, ...)
#endif
