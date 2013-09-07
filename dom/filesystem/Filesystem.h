/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "nsCOMPtr.h"

namespace mozilla {
namespace dom {

// struct StorageType;

namespace filesystem {

class Filesystem MOZ_FINAL
{
public:
NS_DECL_ISUPPORTS

public:
  Filesystem();
  ~Filesystem();

private:
  // StorageType mStorage;
  // nsAutoRefCnt mRefCnt;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
