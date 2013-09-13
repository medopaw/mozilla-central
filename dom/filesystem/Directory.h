/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

#include "nsAutoPtr.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Filesystem;
struct FileInfo;

class Directory MOZ_FINAL : public nsISupports, public nsWrapperCache
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(Directory)

public:
  Directory(Filesystem* aFilesystem, const nsAString& aPath, const nsAString& aName);
  ~Directory();

  Directory* GetParentObject() const;
  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope) MOZ_OVERRIDE;

public:
  Filesystem* GetFilesystem();

private:
  nsRefPtr<Filesystem> mFilesystem;
  const nsString mPath;
  const nsString mName;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
