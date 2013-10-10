/*
 * TaskBase.h
 *
 *  Created on: Sep 29, 2013
 *      Author: yuan
 */

#ifndef mozilla_dom_taskbase_h__
#define mozilla_dom_taskbase_h__

#include "nsThreadUtils.h"
#include "mozilla/dom/filesystem/PFilesystemRequestChild.h"
#include "mozilla/ErrorResult.h"

namespace mozilla {
namespace dom {

class FilesystemParams;
class Promise;

namespace filesystem {

class FilesystemRequestParent;

class TaskBase : public nsRunnable, public PFilesystemRequestChild
{
public:
  TaskBase();
  TaskBase(FilesystemRequestParent* aParent);

  virtual ~TaskBase();

  already_AddRefed<Promise> GetPromise();

  // Overrides nsIRunnable.
  NS_IMETHOD Run() MOZ_OVERRIDE;

protected:
  virtual void Work() = 0;
  virtual void HandlerCallback() = 0;

  virtual FilesystemParams GetRequestParams() = 0;
  virtual FilesystemResponseValue GetSuccessRequestResult() = 0;
  virtual void SetSuccessRequestResult(const FilesystemResponseValue& aValue) = 0;

  void Start();
  void SetError(const nsString& aErrorName);
  void SetError(const nsresult& aErrorCode);

  // Overrides PFilesystemRequestChild
  virtual bool Recv__delete__(const FilesystemResponseValue& value) MOZ_OVERRIDE;
  virtual void ActorDestroy(ActorDestroyReason why);

  bool HasError() { return !mErrorName.IsEmpty(); }

  nsRefPtr<Promise> mPromise;
  nsString mErrorName;
private:
  void HandleResult();
  FilesystemResponseValue GetRequestResult();
  void SetRequestResult(const FilesystemResponseValue& aValue);

  nsRefPtr<FilesystemRequestParent> mRequestParent;
  // Only used on main thread. Don't need a lock.
  nsCOMPtr<nsIThread> mWorkerThread;
};

}
}
}

#endif // mozilla_dom_taskbase_h__
