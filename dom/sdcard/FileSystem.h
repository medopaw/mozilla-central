/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

#include "nsAutoPtr.h"
#include "nsString.h"
#include "Directory.h"

class nsPIDOMWindow;
struct JSContext;

namespace mozilla {
namespace dom {
namespace sdcard {

class FileSystem MOZ_FINAL : public nsISupports, public nsWrapperCache
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(FileSystem)

public:
  explicit FileSystem(nsPIDOMWindow* aWindow, const nsAString& aName, const nsAString& aPath);
  ~FileSystem();

  nsPIDOMWindow* GetParentObject() const;

  virtual JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aScope) MOZ_OVERRIDE;

  void GetName(nsString& retval) const;

  // Mark this as resultNotAddRefed to return raw pointers
  already_AddRefed<Directory> Root();

  static FileSystem* GetFilesystem();

  bool IsValid() const;

private:
  static FileSystem* smFileSystem;
  nsString mName;
  nsRefPtr<Directory> mRoot;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
