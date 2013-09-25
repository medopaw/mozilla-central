/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_filesystem_h__
#define mozilla_dom_filesystem_h__

#include "nsWeakReference.h"
#include "nsAutoPtr.h"

class nsPIDOMWindow;

namespace mozilla {

class ErrorResult;

namespace dom {

class Promise;
class FilesystemParameters;

namespace filesystem {

class PathManager;

class Filesystem MOZ_FINAL : public nsSupportsWeakReference
{
public:
  NS_DECL_ISUPPORTS
  static already_AddRefed<Promise>
  GetInstance(nsPIDOMWindow* aWindow, const FilesystemParameters& parameters,
                ErrorResult& aRv);

  static void ShutdownAll();

  nsPIDOMWindow* GetWindow();
  PathManager* GetPathManager();

private:
  Filesystem(nsPIDOMWindow* aWindow, const nsAString& aBase);
  ~Filesystem();

  void Shutdown();

  static nsRefPtr<Filesystem> sSdcardFilesystem;

  nsCOMPtr<nsPIDOMWindow> mWindow;
  nsRefPtr<PathManager> mPathManager;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_filesystem_h__
